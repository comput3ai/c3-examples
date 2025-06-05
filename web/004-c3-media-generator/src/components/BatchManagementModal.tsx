import { useState, useEffect } from 'react'
import { X, History, Download, Trash2, Eye, Calendar, Image, CheckCircle, AlertTriangle, XCircle, Info, ExternalLink } from 'lucide-react'
import { useGenerationStore } from '../stores/generationStore'
import { useTemplateStore } from '../stores/templateStore'
import { createPromptForCard } from '../lib/core/promptBuilder'
import type { BatchInfo, CachedImage } from '../lib/core/imageCache'
import type { GenerationJob, GenerationResult, GenerationParams, CardData } from '../types/index'

// Media Preview Component - handles both images and videos
interface MediaPreviewProps {
  url: string
  type: 'image' | 'video'
  alt: string
  className?: string
  onClick?: () => void
  title?: string
}

function MediaPreview({ url, type, alt, className, onClick, title }: MediaPreviewProps) {
  if (type === 'video') {
    return (
      <video
        src={url}
        className={className}
        title={title}
        onClick={onClick}
        muted
        loop
        preload="metadata"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        Your browser does not support the video tag.
      </video>
    )
  } else {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        title={title}
        onClick={onClick}
      />
    )
  }
}

// Job Details Modal Component - similar to the one in GenerationStep.tsx
interface JobDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  job: GenerationJob
  result?: GenerationResult
  params: GenerationParams
  cachedPrompts?: any
}

function JobDetailsModal({ isOpen, onClose, job, result, params, cachedPrompts }: JobDetailsModalProps) {
  const { getEffectiveTemplates, conditionalEnhancements } = useTemplateStore()
  
  if (!isOpen) return null

  // For cached images, we should show the actual prompts that were used, not regenerate them
  // If we need to show generated prompts, we can fall back to generation
  const shouldUseStoredPrompts = job.workloadId === 'cached' && cachedPrompts
  let promptData
  
  // Debug logging
  console.log('🔍 JobDetailsModal debug:', {
    shouldUseStoredPrompts,
    cachedPrompts,
    jobWorkloadId: job.workloadId
  })
  
  if (shouldUseStoredPrompts) {
    // Use the stored prompts from the cached image
    promptData = {
      positive: cachedPrompts!.positive || 'No positive prompt data available',
      negative: cachedPrompts!.negative || 'No negative prompt stored',
      seed: result?.seed || 0
    }
  } else {
    // Generate the prompts used for this job (for live jobs)
    const templates = getEffectiveTemplates()
    promptData = createPromptForCard(job.card, params, templates, conditionalEnhancements)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              job.status === 'completed' ? 'bg-green-500' :
              job.status === 'failed' ? 'bg-red-500' :
              job.status === 'processing' ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            <div>
              <h2 className="text-xl font-bold text-white">{job.card.name}</h2>
              <p className="text-gray-300 text-sm">Generation Job Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Job Status & Timing */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Job Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Status</div>
                <div className={`font-medium ${
                  job.status === 'completed' ? 'text-green-400' :
                  job.status === 'failed' ? 'text-red-400' :
                  job.status === 'processing' ? 'text-blue-400' : 'text-gray-300'
                }`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Created</div>
                <div className="font-medium text-white">{new Date(job.createdAt).toLocaleTimeString()}</div>
              </div>
              {job.promptId && (
                <div>
                  <div className="text-gray-400">Prompt ID</div>
                  <div className="font-mono text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">
                    {job.promptId.slice(0, 12)}...
                  </div>
                </div>
              )}
              {result && (
                <div>
                  <div className="text-gray-400">Seed</div>
                  <div className="font-mono text-xs text-white">{result.seed}</div>
                </div>
              )}
            </div>
          </div>

          {/* Card Details */}
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600">
            <h3 className="font-semibold text-blue-300 mb-3">Card Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm">
                  <div className="text-white"><strong>Name:</strong> {job.card.name}</div>
                  <div className="text-white"><strong>Type:</strong> {job.card.card_type}</div>
                  <div className="text-white"><strong>Rarity:</strong> {job.card.rarity}</div>
                </div>
              </div>
              <div>
                <div className="text-sm">
                  <div className="text-white"><strong>Description:</strong></div>
                  <div className="text-gray-300 mt-1">{job.card.description}</div>
                </div>
              </div>
            </div>
            {job.card.flavor_text && (
              <div className="mt-3 text-sm">
                <div className="text-white"><strong>Flavor Text:</strong></div>
                <div className="text-gray-300 italic mt-1">"{job.card.flavor_text}"</div>
              </div>
            )}
          </div>

          {/* Generated Prompts */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Generated Prompts</h3>
            
            <div>
              <h4 className="font-medium text-green-300 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Positive Prompt
              </h4>
              <div className="bg-green-900/20 p-4 rounded-lg border border-green-600">
                <div className="text-sm text-green-300 font-mono whitespace-pre-wrap break-words">
                  {promptData.positive}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-red-300 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Negative Prompt
              </h4>
              <div className="bg-red-900/20 p-4 rounded-lg border border-red-600">
                <div className="text-sm text-red-300 font-mono break-words">
                  {promptData.negative}
                </div>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <details className="bg-purple-900/20 rounded-lg border border-purple-600">
            <summary className="p-4 cursor-pointer hover:bg-purple-900/30 transition-colors">
              <h3 className="font-semibold text-purple-300 inline-flex items-center gap-2">
                <span>Generation Parameters</span>
                <span className="text-sm text-purple-400">(Click to expand)</span>
              </h3>
            </summary>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-purple-400">Size</div>
                  <div className="font-medium text-white">{params.width} × {params.height}</div>
                </div>
                <div>
                  <div className="text-purple-400">Steps</div>
                  <div className="font-medium text-white">{params.steps}</div>
                </div>
                <div>
                  <div className="text-purple-400">Guidance</div>
                  <div className="font-medium text-white">{params.guidance}</div>
                </div>
                <div>
                  <div className="text-purple-400">Model</div>
                  <div className="font-medium text-white">{params.model}</div>
                </div>
                <div>
                  <div className="text-purple-400">Seed</div>
                  <div className="font-mono text-xs text-white">{promptData.seed}</div>
                </div>
                {result?.type === 'video' && (
                  <>
                    <div>
                      <div className="text-purple-400">Media Type</div>
                      <div className="font-medium text-white">Video</div>
                    </div>
                    <div>
                      <div className="text-purple-400">Quality</div>
                      <div className="font-medium text-white">{params.quality || 'Standard'}</div>
                    </div>
                    {params.batchSize && (
                      <div>
                        <div className="text-purple-400">Batch Size</div>
                        <div className="font-medium text-white">{params.batchSize}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </details>

          {/* Error Details */}
          {job.error && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
              <div className="text-sm text-red-800 font-mono">{job.error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> These are the exact prompts and parameters used for generation
            </div>
            <div className="flex gap-2">
              {result?.imageUrl && (
                <button
                  onClick={() => window.open(result.imageUrl, '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {result.type === 'video' ? 'Video' : 'Image'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BatchManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onViewBatch?: (batchId: string) => void
}

export default function BatchManagementModal({ isOpen, onClose, onViewBatch }: BatchManagementModalProps) {
  const { getBatchHistory, loadBatchImages, deleteBatch } = useGenerationStore()
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [batchImages, setBatchImages] = useState<CachedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [selectedJobDetails, setSelectedJobDetails] = useState<{job: GenerationJob, result: GenerationResult, params: GenerationParams, cachedPrompts?: any} | null>(null)
  const [enlargedImage, setEnlargedImage] = useState<CachedImage | null>(null)
  
  // Convert CachedImage to GenerationJob and GenerationResult
  const convertToJobDetails = (image: CachedImage): {job: GenerationJob, result: GenerationResult, params: GenerationParams, cachedPrompts: any} => {
    // Debug logging
    console.log('🔍 Converting cached image to job details:', {
      cardName: image.cardName,
      prompts: image.prompts,
      hasOriginalCard: !!image.originalCard,
      hasJobTiming: !!image.jobTiming
    })
    
    // Use original card data if available, fallback to reconstructed data for older cached images
    const cardData: CardData = image.originalCard || {
      uuid: image.id,
      name: image.cardName,
      description: `Generated ${image.metadata.cardType}`,
      card_type: image.metadata.cardType,
      rarity: image.metadata.rarity
    }

    // Use original job timing if available, fallback to cached timestamp for older cached images
    const createdAt = image.jobTiming?.createdAt || image.metadata.timestamp
    const completedAt = image.jobTiming?.completedAt || image.metadata.timestamp

    // Create job from cached data
    const job: GenerationJob = {
      id: image.id,
      card: cardData,
      workloadId: 'cached',
      status: 'completed',
      createdAt: createdAt,
      completedAt: completedAt,
      imageUrl: image.url
    }

    // Create result from cached data
    const result: GenerationResult = {
      jobId: image.id,
      cardName: image.cardName,
      imageUrl: image.url,
      imageBlob: image.blob || new Blob(),
      mediaUrl: image.url,
      mediaBlob: image.blob,
      type: image.metadata.type,
      prompt: image.prompts.positive,
      seed: image.metadata.seed,
      nodeId: 'cached',
      filename: `${image.cardName}.${image.metadata.type === 'video' ? 'mp4' : 'png'}`
    }

    // Create params from cached metadata
    const params: GenerationParams = {
      width: 1024, // Default values since not stored in metadata
      height: 1024,
      steps: image.metadata.steps,
      guidance: image.metadata.guidance,
      model: image.metadata.model,
      seed: image.metadata.seed
    }

    return { job, result, params, cachedPrompts: image.prompts }
  }
  
  // Keyboard event handler for closing modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (enlargedImage) {
          setEnlargedImage(null)
        } else if (selectedJobDetails) {
          setSelectedJobDetails(null)
        }
      }
    }
    
    if (enlargedImage || selectedJobDetails) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enlargedImage, selectedJobDetails])

  useEffect(() => {
    if (isOpen) {
      loadBatches()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedBatch) {
      loadBatchDetails(selectedBatch)
    }
  }, [selectedBatch])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const batchHistory = await getBatchHistory()
      setBatches(batchHistory)
    } catch (error) {
      console.error('Failed to load batch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBatchDetails = async (batchId: string) => {
    setLoading(true)
    try {
      const images = await loadBatchImages(batchId)
      setBatchImages(images)
      
      // Create object URLs for cached images
      const urlMap = new Map<string, string>()
      for (const image of images) {
        try {
          if (image.blob) {
            const url = URL.createObjectURL(image.blob)
            urlMap.set(image.id, url)
          } else if (image.url) {
            urlMap.set(image.id, image.url)
          }
        } catch (error) {
          console.warn('Failed to create URL for image:', image.id, error)
        }
      }
      setImageUrls(urlMap)
    } catch (error) {
      console.error('Failed to load batch images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteBatch(batchId)
      setBatches(prev => prev.filter(b => b.id !== batchId))
      
      if (selectedBatch === batchId) {
        setSelectedBatch(null)
        setBatchImages([])
        setImageUrls(new Map())
      }
    } catch (error) {
      console.error('Failed to delete batch:', error)
      alert('Failed to delete batch')
    }
  }

  const handleDownloadBatch = async (batch: BatchInfo) => {
    if (batchImages.length === 0) {
      alert('No images to download in this batch')
      return
    }

    console.log(`📥 Creating ZIP archive for batch: ${batch.name}`)
    
    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Add each image to the ZIP
      for (const image of batchImages) {
        try {
          const url = imageUrls.get(image.id)
          if (url) {
            // Fetch the blob if we have a cached image
            let blob: Blob
            if (image.blob) {
              blob = image.blob
            } else {
              // Fetch from URL
              const response = await fetch(url)
              blob = await response.blob()
            }
            
            const extension = image.metadata.type === 'video' ? 'mp4' : 'png'
            const filename = `${image.cardName.replace(/[^a-zA-Z0-9]/g, '_')}_${image.metadata.seed}.${extension}`
            zip.file(filename, blob)
            console.log(`✅ Added to ZIP: ${filename}`)
          }
        } catch (error) {
          console.error(`❌ Failed to add ${image.cardName} to ZIP:`, error)
        }
      }

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Create download link
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `${batch.name.replace(/[^a-zA-Z0-9]/g, '_')}_batch.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('📥 Batch ZIP download completed')
    } catch (error) {
      console.error('❌ Failed to create batch ZIP download:', error)
      
      // Fallback to individual downloads
      console.log('📥 Falling back to individual downloads')
      batchImages.forEach((image, index) => {
        const url = imageUrls.get(image.id)
        if (url) {
          const link = document.createElement('a')
          link.href = url
          const extension = image.metadata.type === 'video' ? 'mp4' : 'png'
          link.download = `${batch.name.replace(/[^a-zA-Z0-9]/g, '_')}_${image.cardName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
    }
  }

  const handleImageClick = (image: CachedImage) => {
    setEnlargedImage(image)
  }

  const handleDetailsClick = (image: CachedImage) => {
    setSelectedJobDetails(convertToJobDetails(image))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getBatchStatusIcon = (batch: BatchInfo) => {
    if (batch.status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (batch.status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-600" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getBatchStatusColor = (batch: BatchInfo) => {
    if (batch.status === 'completed') {
      return 'bg-green-900/20 border-green-600'
    } else if (batch.status === 'partial') {
      return 'bg-yellow-900/20 border-yellow-600'
    } else {
      return 'bg-red-900/20 border-red-600'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-[#FF7E06]" />
            <h2 className="text-xl font-bold text-white">Generation History</h2>
            {batches.length > 0 && (
              <span className="px-2 py-1 bg-purple-900/20 text-purple-300 text-xs rounded-full border border-purple-600">
                {batches.length} batches
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[70vh]">
          {/* Batch List */}
          <div className="w-1/3 border-r border-gray-700 overflow-y-auto bg-gray-700">
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-white">Generation Batches</h3>
              
              {loading && batches.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Loading batches...
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No generation history yet</p>
                  <p className="text-xs">Start generating images to see them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedBatch === batch.id 
                          ? 'border-[#FF7E06] bg-orange-900/20' 
                          : getBatchStatusColor(batch)
                      } hover:shadow-sm`}
                      onClick={() => setSelectedBatch(batch.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getBatchStatusIcon(batch)}
                          <h4 className="font-medium text-sm truncate text-white">{batch.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadBatch(batch)
                            }}
                            className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-[#FF7E06]"
                            title="Download batch"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBatch(batch.id)
                            }}
                            className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-red-400"
                            title="Delete batch"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-300 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(batch.timestamp).toLocaleDateString()} {new Date(batch.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          {batch.completedCards}/{batch.totalCards} completed
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                        <div 
                          className={`h-1.5 rounded-full ${
                            batch.status === 'completed' ? 'bg-green-600' :
                            batch.status === 'partial' ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${(batch.completedCards / batch.totalCards) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Batch Details */}
          <div className="flex-1 overflow-y-auto bg-gray-800">
            {selectedBatch ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Batch Images</h3>
                  <span className="text-sm text-gray-300">
                    {batchImages.length} images
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    Loading images...
                  </div>
                ) : batchImages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No images in this batch</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {batchImages.map((image) => {
                      const imageUrl = imageUrls.get(image.id)
                      return (
                        <div key={image.id} className="bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                          {imageUrl ? (
                            <div className="relative group">
                              <MediaPreview
                                url={imageUrl}
                                type={image.metadata.type}
                                alt={image.cardName}
                                className="w-full h-32 object-cover cursor-pointer"
                                onClick={() => handleImageClick(image)}
                                title="Click to enlarge"
                              />
                              <div 
                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center cursor-pointer"
                                onClick={() => handleImageClick(image)}
                                title="Click to enlarge"
                              >
                                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {/* Details button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDetailsClick(image)
                                }}
                                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                                title="View job details"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-32 bg-gray-600 flex items-center justify-center">
                              <Image className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          
                          <div className="p-3">
                            <h4 className="font-medium text-sm truncate text-white" title={image.cardName}>
                              {image.cardName}
                            </h4>
                            <div className="text-xs text-gray-300 mt-1 space-y-1">
                              <div>{image.metadata.cardType} • {image.metadata.rarity}</div>
                              <div>Steps: {image.metadata.steps} • Seed: {image.metadata.seed}</div>
                              {image.blob && (
                                <div className="text-green-400">
                                  Cached ({formatFileSize(image.blob.size)})
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleDetailsClick(image)}
                                className="flex-1 text-xs px-2 py-1 bg-blue-900/20 text-blue-300 rounded hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-1 border border-blue-600"
                              >
                                <Info className="h-3 w-3" />
                                Details
                              </button>
                              {imageUrl && (
                                <button
                                  onClick={() => {
                                    const a = document.createElement('a')
                                    a.href = imageUrl
                                    const extension = image.metadata.type === 'video' ? 'mp4' : 'png'
                                    a.download = `${image.cardName.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`
                                    a.click()
                                  }}
                                  className="flex-1 text-xs px-2 py-1 bg-green-900/20 text-green-300 rounded hover:bg-green-900/30 transition-colors border border-green-600"
                                >
                                  Download
                                </button>
                              )}
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                                  View prompts
                                </summary>
                                <div className="mt-1 p-2 bg-gray-600 rounded text-xs border border-gray-500">
                                  <div className="mb-1">
                                    <strong className="text-white">Positive:</strong> <span className="text-gray-200">{image.prompts.positive.slice(0, 100)}...</span>
                                  </div>
                                  <div>
                                    <strong className="text-white">Negative:</strong> <span className="text-gray-200">{image.prompts.negative.slice(0, 100)}...</span>
                                  </div>
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a batch to view its images</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center text-sm text-gray-300">
            <p>
              💾 Images are cached in your browser for offline viewing
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00]"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {selectedJobDetails && (
        <JobDetailsModal
          isOpen={true}
          onClose={() => setSelectedJobDetails(null)}
          job={selectedJobDetails.job}
          result={selectedJobDetails.result}
          params={selectedJobDetails.params}
          cachedPrompts={selectedJobDetails.cachedPrompts}
        />
      )}

      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] p-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-2 -right-2 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              title="Close (ESC)"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Image container */}
            <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden max-w-full max-h-full">
              {(() => {
                const imageUrl = imageUrls.get(enlargedImage.id)
                return imageUrl ? (
                  <div className="relative">
                    {enlargedImage.metadata.type === 'video' ? (
                      <video
                        src={imageUrl}
                        className="max-w-[90vw] max-h-[80vh] object-contain block"
                        controls
                        autoPlay
                        loop
                        muted
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={imageUrl}
                        alt={enlargedImage.cardName}
                        className="max-w-[90vw] max-h-[80vh] object-contain block"
                      />
                    )}
                    
                    {/* Image overlay info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-4">
                      <h3 className="font-bold text-lg mb-1">{enlargedImage.cardName}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {enlargedImage.metadata.cardType}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          enlargedImage.metadata.rarity === 'Common' ? 'bg-gray-500/80' :
                          enlargedImage.metadata.rarity === 'Legendary' ? 'bg-yellow-500/80' :  
                          enlargedImage.metadata.rarity === 'Rare' ? 'bg-blue-500/80' :
                          enlargedImage.metadata.rarity === 'Uncommon' ? 'bg-green-500/80' :
                          enlargedImage.metadata.rarity === 'Epic' ? 'bg-purple-500/80' :
                          'bg-gray-500/80'
                        }`}>
                          {enlargedImage.metadata.rarity}
                        </span>
                        <span className="text-gray-300">
                          Steps: {enlargedImage.metadata.steps} • Seed: {enlargedImage.metadata.seed}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-300">
                          {enlargedImage.metadata.type === 'video' ? 'Video controls available • ' : ''}
                          Click outside to close • Right-click to save {enlargedImage.metadata.type === 'video' ? 'video' : 'image'}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDetailsClick(enlargedImage)
                          }}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-sm flex items-center gap-1 transition-colors"
                        >
                          <Info className="h-3 w-3" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-96 h-64 flex items-center justify-center text-gray-500 bg-gray-100">
                    <div className="text-center">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Media not available</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 