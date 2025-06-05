// Browser-based image cache for storing generated images and metadata
interface CachedImage {
  id: string
  url: string
  blob?: Blob
  cardName: string
  prompts: {
    positive: string
    negative: string
  }
  // Store complete original card data
  originalCard: {
    uuid: string
    name: string
    description: string
    flavor_text?: string
    rarity: string
    card_type: string
    [key: string]: any
  }
  // Store original job timing
  jobTiming: {
    createdAt: number
    completedAt: number
  }
  metadata: {
    cardType: string
    rarity: string
    seed: number
    steps: number
    guidance: number
    model: string
    type: 'image' | 'video'  // Media type
    timestamp: number  // When cached, not when generated
    batchId: string
  }
}

interface BatchInfo {
  id: string
  name: string
  timestamp: number
  totalCards: number
  completedCards: number
  images: string[] // Array of image IDs
  status: 'completed' | 'partial' | 'failed'
}

class ImageCache {
  private dbName = 'CardGeneratorImageCache'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result

        // Create images store
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' })
          imageStore.createIndex('batchId', 'metadata.batchId', { unique: false })
          imageStore.createIndex('timestamp', 'metadata.timestamp', { unique: false })
        }

        // Create batches store
        if (!db.objectStoreNames.contains('batches')) {
          const batchStore = db.createObjectStore('batches', { keyPath: 'id' })
          batchStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async cacheImage(imageUrl: string, imageData: CachedImage): Promise<void> {
    if (!this.db) await this.init()

    try {
      // Optionally download and store the blob for offline access
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      const imageWithBlob: CachedImage = {
        ...imageData,
        blob
      }

      const transaction = this.db!.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      await new Promise<void>((resolve, reject) => {
        const request = store.put(imageWithBlob)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      console.log('✅ Cached image:', imageData.cardName)
    } catch (error) {
      console.warn('⚠️ Failed to cache image blob, storing metadata only:', error)
      
      // Fallback: store without blob
      const transaction = this.db!.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      await new Promise<void>((resolve, reject) => {
        const request = store.put(imageData)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }

  async saveBatch(batch: BatchInfo): Promise<void> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(['batches'], 'readwrite')
    const store = transaction.objectStore('batches')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(batch)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    console.log('✅ Saved batch:', batch.name)
  }

  async getBatches(): Promise<BatchInfo[]> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(['batches'], 'readonly')
    const store = transaction.objectStore('batches')
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev') // Most recent first
      const batches: BatchInfo[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          batches.push(cursor.value)
          cursor.continue()
        } else {
          resolve(batches)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getBatchImages(batchId: string): Promise<CachedImage[]> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(['images'], 'readonly')
    const store = transaction.objectStore('images')
    const index = store.index('batchId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(batchId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getImage(imageId: string): Promise<CachedImage | null> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(['images'], 'readonly')
    const store = transaction.objectStore('images')

    return new Promise((resolve, reject) => {
      const request = store.get(imageId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteBatch(batchId: string): Promise<void> {
    if (!this.db) await this.init()

    // Delete all images in the batch
    const images = await this.getBatchImages(batchId)
    const transaction = this.db!.transaction(['images', 'batches'], 'readwrite')
    const imageStore = transaction.objectStore('images')
    const batchStore = transaction.objectStore('batches')

    for (const image of images) {
      imageStore.delete(image.id)
    }
    batchStore.delete(batchId)

    console.log('🗑️ Deleted batch and', images.length, 'images')
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        }
      }
    } catch (error) {
      console.warn('Storage estimation not available:', error)
    }
    
    return { used: 0, available: 0 }
  }

  async createImageUrl(cachedImage: CachedImage): Promise<string> {
    if (cachedImage.blob) {
      // Create object URL from cached blob
      return URL.createObjectURL(cachedImage.blob)
    } else if (cachedImage.url) {
      // Use original URL (may not work offline)
      return cachedImage.url
    } else {
      throw new Error('No image data available')
    }
  }

  async cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // Clean up images older than maxAge (default: 7 days)
    if (!this.db) await this.init()

    const cutoffTime = Date.now() - maxAgeMs
    const transaction = this.db!.transaction(['images'], 'readwrite')
    const store = transaction.objectStore('images')
    const index = store.index('timestamp')

    return new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))
      let deletedCount = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          console.log(`🧹 Cleaned up ${deletedCount} old cached images`)
          resolve()
        }
      }
    })
  }
}

// Global instance
export const imageCache = new ImageCache()

// Initialize on first import
imageCache.init().catch(console.error)

export type { CachedImage, BatchInfo } 