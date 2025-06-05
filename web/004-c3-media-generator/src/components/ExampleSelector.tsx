import { useState, useEffect } from 'react'
import { ExampleCSVLoader, type CSVExample } from '../lib/api/exampleCSVLoader'
import { useCSVStore } from '../stores/csvStore'
import { useAppStore } from '../stores/appStore'
import { FileText, Database, Eye, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface ExampleSelectorProps {
  onExampleSelected?: () => void
}

export default function ExampleSelector({ onExampleSelected }: ExampleSelectorProps) {
  const [examples, setExamples] = useState<CSVExample[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedExample, setExpandedExample] = useState<string | null>(null)
  
  const { loadExample, isProcessing } = useCSVStore()
  const { setError: setAppError } = useAppStore()

  useEffect(() => {
    loadExamples()
  }, [])

  const loadExamples = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const loader = ExampleCSVLoader.getInstance()
      // Refresh examples to pick up any new files
      loader.refreshExamples()
      const loadedExamples = await loader.loadExamples()
      
      // Remove any potential duplicates based on fileName
      const uniqueExamples = loadedExamples.filter((example, index, self) => 
        index === self.findIndex(e => e.fileName === example.fileName)
      )
      
      setExamples(uniqueExamples)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load examples'
      setError(errorMessage)
      console.error('Failed to load CSV examples:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectExample = async (example: CSVExample) => {
    try {
      await loadExample(example)
      onExampleSelected?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load example'
      setAppError(`Failed to load example: ${errorMessage}`)
    }
  }

  const toggleExpanded = (fileName: string) => {
    setExpandedExample(expandedExample === fileName ? null : fileName)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-900/20'
    if (confidence >= 0.6) return 'text-amber-400 bg-amber-900/20'
    return 'text-red-400 bg-red-900/20'
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF7E06]" />
          <span className="text-gray-300">Loading examples...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Failed to load examples</p>
            <p className="text-xs text-red-400 mt-1">{error}</p>
            <button 
              onClick={loadExamples}
              className="text-xs text-red-300 underline mt-2 hover:text-red-200"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (examples.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-300">No examples available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="text-lg font-medium text-white">
            Or choose from these examples:
          </h3>
          <button
            onClick={loadExamples}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-[#FF7E06] disabled:opacity-50 transition-colors"
            title="Refresh examples (check for new CSV files)"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-300">
          Click on an example to explore its structure, or select "Use this example" to get started
        </p>
        <p className="text-xs text-gray-400 mt-1">
          💡 <strong>If you run this locally: </strong> Just add any CSV file to <code className="bg-gray-700 text-gray-200 px-1 rounded">public/examplecsvs/</code>
          <br />The system will automatically discover and load it. No configuration needed! 🎯
        </p>
      </div>

      <div className="grid gap-4">
        {examples.map((example, index) => (
          <div 
            key={`${example.fileName}-${index}`}
            className="border border-gray-700 bg-gray-800 rounded-lg hover:border-[#FF7E06] transition-colors"
          >
            {/* Example Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-[#FF7E06]" />
                  <div>
                    <h4 className="font-medium text-white">{example.name}</h4>
                    <p className="text-sm text-gray-300">{example.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {example.totalRows} rows
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(example.analysis.confidence.overall)}`}>
                    {Math.round(example.analysis.confidence.overall * 100)}% match
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => toggleExpanded(example.fileName)}
                  className="flex items-center space-x-1 text-sm text-[#FF7E06] hover:text-[#e06b00]"
                >
                  <Eye className="w-4 h-4" />
                  <span>{expandedExample === example.fileName ? 'Hide' : 'Preview'}</span>
                </button>

                <button
                  onClick={() => handleSelectExample(example)}
                  disabled={isProcessing}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Loading...
                    </>
                  ) : (
                    'Use this example'
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Preview */}
            {expandedExample === example.fileName && (
              <div className="border-t border-gray-700 bg-gray-700 p-4">
                <div className="space-y-4">
                  {/* Column Information */}
                  <div>
                    <h5 className="text-sm font-medium text-white mb-2">
                      Detected Columns ({example.analysis.columns.length}):
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {example.analysis.columns.slice(0, 8).map((column, idx) => (
                        <div key={idx} className="text-xs bg-gray-600 rounded px-2 py-1 border border-gray-600">
                          <span className="font-medium text-white">{column.name}</span>
                          <span className="text-gray-300 ml-1">({column.type})</span>
                        </div>
                      ))}
                      {example.analysis.columns.length > 8 && (
                        <div className="text-xs text-gray-400 col-span-2 text-center">
                          ... and {example.analysis.columns.length - 8} more columns
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sample Data */}
                  <div>
                    <h5 className="text-sm font-medium text-white mb-2">
                      Sample Data (first 2 rows):
                    </h5>
                    <div className="bg-gray-600 border border-gray-600 rounded overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-800">
                          <tr>
                            {example.analysis.columns.slice(0, 4).map((column) => (
                              <th key={column.name} className="px-3 py-2 text-left font-medium text-white border-r border-gray-500 last:border-r-0">
                                {column.name}
                              </th>
                            ))}
                            {example.analysis.columns.length > 4 && (
                              <th className="px-3 py-2 text-center text-gray-300">
                                +{example.analysis.columns.length - 4} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {example.sampleRows.slice(0, 2).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t border-gray-500">
                              {example.analysis.columns.slice(0, 4).map((column) => (
                                <td key={column.name} className="px-3 py-2 border-r border-gray-500 last:border-r-0">
                                  <div className="truncate max-w-32 text-gray-200" title={row[column.name]}>
                                    {row[column.name] || <span className="text-gray-400">-</span>}
                                  </div>
                                </td>
                              ))}
                              {example.analysis.columns.length > 4 && (
                                <td className="px-3 py-2 text-center text-gray-400">
                                  ...
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Suggested Mappings */}
                  {Object.keys(example.analysis.suggestedMappings).length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-white mb-2">
                        Smart Detection Results:
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(example.analysis.suggestedMappings).map(([field, column]) => 
                          column ? (
                            <div key={field} className="flex items-center justify-between text-xs">
                              <span className="text-gray-300 capitalize">{field}:</span>
                              <div className="flex items-center space-x-1">
                                <code className="bg-[#FF7E06] text-white px-1.5 py-0.5 rounded">{column}</code>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${getConfidenceColor(example.analysis.confidence[field as keyof typeof example.analysis.confidence])}`}>
                                  {Math.round(example.analysis.confidence[field as keyof typeof example.analysis.confidence] * 100)}%
                                </span>
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 