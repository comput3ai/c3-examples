import { create } from 'zustand'

interface UploadedImage {
  id: string
  name: string
  url: string
  file: File
  size: number
  type: string
  uploadedAt: Date
}

interface ImageStore {
  // Uploaded images
  uploadedImages: UploadedImage[]
  selectedImageId: string | null
  
  // Upload state
  isUploading: boolean
  uploadError: string | null
  
  // Actions
  uploadImage: (file: File) => Promise<string>
  selectImage: (imageId: string | null) => void
  removeImage: (imageId: string) => void
  clearAllImages: () => void
  getSelectedImage: () => UploadedImage | null
  getImageUrl: (imageId: string) => string | null
}

export const useImageStore = create<ImageStore>((set, get) => ({
  // Initial state
  uploadedImages: [],
  selectedImageId: null,
  isUploading: false,
  uploadError: null,

  uploadImage: async (file: File) => {
    set({ isUploading: true, uploadError: null })
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Image must be smaller than 50MB')
      }
      
      // Create object URL for preview
      const url = URL.createObjectURL(file)
      
      // Create image record
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const image: UploadedImage = {
        id: imageId,
        name: file.name,
        url,
        file,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }
      
      // Add to store
      const { uploadedImages } = get()
      set({ 
        uploadedImages: [...uploadedImages, image],
        selectedImageId: imageId,
        isUploading: false,
        uploadError: null
      })
      
      console.log(`✅ Image uploaded: ${file.name} (${Math.round(file.size / 1024)}KB)`)
      return imageId
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed'
      set({ 
        isUploading: false, 
        uploadError: errorMsg 
      })
      console.error('❌ Image upload failed:', error)
      throw error
    }
  },

  selectImage: (imageId: string | null) => {
    set({ selectedImageId: imageId })
  },

  removeImage: (imageId: string) => {
    const { uploadedImages, selectedImageId } = get()
    
    // Find and revoke the URL to prevent memory leaks
    const image = uploadedImages.find(img => img.id === imageId)
    if (image) {
      URL.revokeObjectURL(image.url)
    }
    
    // Remove from list
    const updatedImages = uploadedImages.filter(img => img.id !== imageId)
    
    // Update selection if removed image was selected
    const newSelectedId = selectedImageId === imageId 
      ? (updatedImages.length > 0 ? updatedImages[0].id : null)
      : selectedImageId
    
    set({ 
      uploadedImages: updatedImages,
      selectedImageId: newSelectedId
    })
  },

  clearAllImages: () => {
    const { uploadedImages } = get()
    
    // Revoke all URLs to prevent memory leaks
    uploadedImages.forEach(image => {
      URL.revokeObjectURL(image.url)
    })
    
    set({ 
      uploadedImages: [],
      selectedImageId: null,
      uploadError: null
    })
  },

  getSelectedImage: () => {
    const { uploadedImages, selectedImageId } = get()
    return uploadedImages.find(img => img.id === selectedImageId) || null
  },

  getImageUrl: (imageId: string) => {
    const { uploadedImages } = get()
    const image = uploadedImages.find(img => img.id === imageId)
    return image ? image.url : null
  }
}))

// Cleanup URLs when the page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { uploadedImages } = useImageStore.getState()
    uploadedImages.forEach(image => {
      URL.revokeObjectURL(image.url)
    })
  })
} 