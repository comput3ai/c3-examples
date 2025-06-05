import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useGenerationStore } from '../stores/generationStore'
import { History, RefreshCw, Download } from 'lucide-react'
import BatchManagementModal from './BatchManagementModal'

export default function ResultsStep() {
  const { previousStep, reset } = useAppStore()
  const { results, reset: resetGeneration } = useGenerationStore()
  const [showHistoryModal, setShowHistoryModal] = useState(true) // Auto-open on mount

  const handleStartNew = () => {
    resetGeneration()
    reset()
  }

  const handleCloseHistory = () => {
    setShowHistoryModal(false)
  }

  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Generation Complete!</h2>
        <p className="text-gray-300">
          Your media generation is finished. You can now download your results or go back to generate more.
        </p>
      </div>

      {/* Action buttons */}
      <div className="space-y-4">
        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-3 mx-auto text-lg font-medium shadow-lg"
        >
          <History className="h-6 w-6" />
          View Generation History
        </button>

        <div className="flex justify-center space-x-4">
          <button
            onClick={previousStep}
            className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            ← Back to Generation
          </button>
          
          <button
            onClick={handleStartNew}
            className="px-6 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Start New Generation
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <p className="text-green-300 font-medium">
              ✅ Successfully generated {results.length} images/videos
            </p>
            <p className="text-green-200 text-sm mt-1">
              Click "View Generation History" to see details, download, or manage your generated content.
            </p>
          </div>
        )}
      </div>

      {/* Generation History Modal */}
      <BatchManagementModal
        isOpen={showHistoryModal}
        onClose={handleCloseHistory}
      />
    </div>
  )
} 