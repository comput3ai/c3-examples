import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useCSVStore } from '../stores/csvStore'
import { FileText, Upload, CheckCircle, AlertCircle, Lightbulb, Settings } from 'lucide-react'
import ExampleSelector from './ExampleSelector'

export default function CSVUploadStep() {
  const { nextStep, setError } = useAppStore()
  const { 
    rawData, 
    fileName, 
    isProcessing, 
    uploadCSV, 
    useDynamicSystem, 
    toggleDynamicSystem,
    dynamicAnalysis
  } = useCSVStore()
  
  const [dragActive, setDragActive] = useState(false)
  const [showExamples, setShowExamples] = useState(true)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    try {
      await uploadCSV(file)
      setShowExamples(false) // Hide examples after upload
    } catch (error) {
      setError('Failed to process CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleContinue = () => {
    if (!rawData) return
    nextStep()
  }

  const handleExampleSelected = () => {
    setShowExamples(false) // Hide examples after selection
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img src="/images/logo.png" alt="AI Media Studio" className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Upload CSV Data</h2>
            <p className="text-gray-300">
              Upload your CSV file to start generating media. The system will automatically detect your data structure.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#FF7E06] bg-orange-900/20'
                : isProcessing
                ? 'border-gray-600 bg-gray-700'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <div className="space-y-4">
                <div className="animate-spin h-12 w-12 border-4 border-[#FF7E06] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-300">Processing CSV file...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-white">Drop your CSV file here</p>
                  <p className="text-gray-300">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-4 py-2 bg-[#FF7E06] text-white rounded-md hover:bg-[#e06b00] transition-colors cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            )}
          </div>

          {fileName && (
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 mt-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <div>
                  <p className="font-medium text-green-300">File uploaded successfully</p>
                  <p className="text-sm text-green-400">{fileName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Example Selector - shown when no data is loaded and examples should be visible */}
        {!rawData && showExamples && (
          <div className="max-w-4xl mx-auto">
            <ExampleSelector onExampleSelected={handleExampleSelected} />
          </div>
        )}

        {/* Results Section */}
        {rawData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Smart Detection Results or Legacy Requirements */}
            {useDynamicSystem && dynamicAnalysis ? (
              <div className="card">
                <div className="flex items-center mb-4">
                  <Lightbulb className="w-6 h-6 text-[#FF7E06] mr-2" />
                  <h3 className="text-lg font-medium text-white">Smart Detection Results</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Overall Confidence:</span>
                    <span className={`text-sm px-2 py-1 rounded ${getConfidenceColor(dynamicAnalysis.confidence.overall)}`}>
                      {Math.round(dynamicAnalysis.confidence.overall * 100)}%
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Detected Columns ({dynamicAnalysis.columns.length}):</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {dynamicAnalysis.columns.slice(0, 6).map((column, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-gray-700 rounded px-3 py-2">
                          <span className="font-medium text-white">{column.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-300 capitalize">{column.type}</span>
                            <span className="text-xs text-gray-300">({column.uniqueCount} unique)</span>
                          </div>
                        </div>
                      ))}
                      {dynamicAnalysis.columns.length > 6 && (
                        <div className="text-xs text-gray-400 text-center">
                          ... and {dynamicAnalysis.columns.length - 6} more columns
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white">Suggested Mappings:</h4>
                    {Object.entries(dynamicAnalysis.suggestedMappings).map(([field, column]) => 
                      column ? (
                        <div key={field} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 capitalize">{field}:</span>
                          <div className="flex items-center space-x-2">
                            <code className="bg-[#FF7E06] text-white px-2 py-1 rounded text-xs">{column}</code>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(dynamicAnalysis.confidence[field as keyof typeof dynamicAnalysis.confidence])}`}>
                              {Math.round(dynamicAnalysis.confidence[field as keyof typeof dynamicAnalysis.confidence] * 100)}%
                            </span>
                          </div>
                        </div>
                      ) : null
                    )}
                    {Object.keys(dynamicAnalysis.suggestedMappings).length === 0 && (
                      <p className="text-sm text-gray-400 italic">No automatic suggestions - fields will be configured automatically</p>
                    )}
                  </div>

                  {dynamicAnalysis.confidence.overall < 0.7 && (
                    <div className="bg-amber-900/20 border border-amber-700 rounded p-3">
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-300">Low Detection Confidence</p>
                          <p className="text-xs text-amber-400 mt-1">
                            The system couldn't confidently detect standard fields. Manual configuration may be needed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Legacy Requirements Display */
              <div className="card">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-[#FF7E06] mr-2" />
                  <h3 className="text-lg font-medium text-white">CSV Requirements</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white mb-2">Required Columns:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">name</code> - Card name</li>
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">description</code> - Card description</li>
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">rarity</code> - Card rarity</li>
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">card_type</code> - Type of card</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-white mb-2">Optional Columns:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">uuid</code> - Unique identifier</li>
                      <li>• <code className="bg-gray-700 text-gray-200 px-1 rounded">flavor_text</code> - Flavor text</li>
                    </ul>
                  </div>

                  <div className="bg-amber-900/20 border border-amber-700 rounded-md p-3">
                    <p className="text-sm text-amber-300">
                      <strong>Note:</strong> Column names will be auto-detected and configured automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  <div>
                    <p className="font-medium text-green-300">
                      CSV loaded successfully - {rawData.length} rows detected
                    </p>
                    {useDynamicSystem && dynamicAnalysis && (
                      <p className="text-sm text-green-400">
                        {dynamicAnalysis.columns.length} columns detected with {Math.round(dynamicAnalysis.confidence.overall * 100)}% confidence
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleContinue}
                  className="btn-primary"
                >
                  Continue to Workloads
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 