import { useState, useEffect } from 'react'
import { useTemplateStore } from '../stores/templateStore'
import { useCSVStore } from '../stores/csvStore'
import { X, Plus, Trash2, Settings, Sparkles, Info, Save, RotateCcw } from 'lucide-react'
import type { CardData } from '../types'

interface ConditionalEnhancementModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConditionalEnhancementModal({ isOpen, onClose }: ConditionalEnhancementModalProps) {
  const { validatedCards } = useCSVStore()
  const { conditionalEnhancements, setConditionalEnhancement, removeConditionalEnhancement, saveTemplates } = useTemplateStore()
  
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [editingEnhancement, setEditingEnhancement] = useState<{ column: string; value: string; text: string } | null>(null)
  const [newEnhancementText, setNewEnhancementText] = useState('')

  // Keyboard event handler for closing modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (editingEnhancement) {
          // Cancel editing first if in editing mode
          cancelEditing()
        } else {
          // Close modal if not editing
          onClose()
        }
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, editingEnhancement, onClose])

  // Get available CSV columns from the validated cards
  const availableColumns = validatedCards.length > 0 
    ? Object.keys(validatedCards[0]).filter(key => key !== 'name') // Exclude name as it's the identifier
    : []

  // Get unique values for the selected column
  const getUniqueValuesForColumn = (column: string): string[] => {
    if (!column || validatedCards.length === 0) return []
    
    const values = validatedCards
      .map(card => (card as any)[column])
      .filter(value => value && value.toString().trim())
      .map(value => value.toString().trim())
    
    return [...new Set(values)].sort()
  }

  const uniqueValues = selectedColumn ? getUniqueValuesForColumn(selectedColumn) : []

  const handleSaveEnhancement = () => {
    if (editingEnhancement && newEnhancementText.trim()) {
      setConditionalEnhancement(
        editingEnhancement.column, 
        editingEnhancement.value, 
        newEnhancementText.trim()
      )
      setEditingEnhancement(null)
      setNewEnhancementText('')
    }
  }

  const handleRemoveEnhancement = (column: string, value: string) => {
    removeConditionalEnhancement(column, value)
  }

  const handleRemoveColumn = (column: string) => {
    removeConditionalEnhancement(column)
    if (selectedColumn === column) {
      setSelectedColumn('')
    }
  }

  const getCurrentEnhancement = (column: string, value: string): string => {
    return conditionalEnhancements[column]?.[value] || ''
  }

  const startEditing = (column: string, value: string) => {
    const currentText = getCurrentEnhancement(column, value)
    setEditingEnhancement({ column, value, text: currentText })
    setNewEnhancementText(currentText)
  }

  const cancelEditing = () => {
    setEditingEnhancement(null)
    setNewEnhancementText('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[98vw] h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-full">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Conditional Enhancements</h2>
              <p className="text-gray-300 text-sm">Customize prompts based on CSV attribute values</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-140px)]">
          {/* Left Panel - Column Selection */}
          <div className="w-1/3 p-6 border-r border-gray-700 bg-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <h3 className="font-semibold text-white">CSV Columns</h3>
            </div>
            
            <div className="space-y-2 max-h-[calc(95vh-300px)] overflow-y-auto">
              {availableColumns.map(column => {
                const uniqueValues = getUniqueValuesForColumn(column)
                const hasEnhancements = conditionalEnhancements[column] && 
                  Object.keys(conditionalEnhancements[column]).length > 0
                
                return (
                  <div key={column} className="group">
                    <button
                      onClick={() => setSelectedColumn(column)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedColumn === column
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-600 border-gray-500 hover:bg-gray-500 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {column}
                            {hasEnhancements && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {uniqueValues.length} unique values
                          </div>
                        </div>
                        {hasEnhancements && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveColumn(column)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
            
            {availableColumns.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>No CSV data loaded</p>
                <p className="text-xs">Upload and validate input first</p>
              </div>
            )}
          </div>

          {/* Right Panel - Value Mapping */}
          <div className="flex-1 p-6">
            {selectedColumn ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">
                      Configure "{selectedColumn}" Enhancements
                    </h3>
                    <p className="text-sm text-gray-300">
                      Set custom prompt enhancements for each {selectedColumn} value
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[calc(95vh-340px)] overflow-y-auto">
                  {uniqueValues.map(value => {
                    const currentEnhancement = getCurrentEnhancement(selectedColumn, value)
                    const isEditing = editingEnhancement?.column === selectedColumn && 
                                     editingEnhancement?.value === value

                    return (
                      <div key={value} className="border rounded-lg p-4 bg-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-white">{value}</div>
                            <div className="text-xs text-gray-400">
                              Found in {validatedCards.filter(card => (card as any)[selectedColumn] === value).length} cards
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {currentEnhancement && !isEditing && (
                              <button
                                onClick={() => handleRemoveEnhancement(selectedColumn, value)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={newEnhancementText}
                              onChange={(e) => setNewEnhancementText(e.target.value)}
                              placeholder="Enter enhancement text (e.g., 'divine radiance, golden light, epic proportions')"
                              className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEnhancement}
                                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-sm hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {currentEnhancement ? (
                              <div 
                                className="bg-green-600 border border-green-500 p-3 rounded text-sm text-green-200 cursor-pointer hover:bg-green-500 transition-colors"
                                onClick={() => startEditing(selectedColumn, value)}
                              >
                                "{currentEnhancement}"
                                <div className="text-xs text-green-400 mt-1">Click to edit</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(selectedColumn, value)}
                                className="w-full p-3 border-2 border-dashed border-gray-600 rounded text-sm text-gray-400 hover:border-purple-500 hover:text-purple-300 transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Add enhancement for "{value}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {uniqueValues.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Info className="h-8 w-8 mx-auto mb-2" />
                    <p>No values found for "{selectedColumn}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <Settings className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a CSV Column</h3>
                <p className="text-sm">
                  Choose a column from the left to configure conditional enhancements
                </p>
                <div className="mt-4 p-4 bg-blue-600 rounded-lg text-left">
                  <h4 className="font-medium text-blue-200 mb-2">💡 How it works:</h4>
                  <ul className="text-sm text-blue-400 space-y-1">
                    <li>• Select a CSV column (like "rarity" or "card_type")</li>
                    <li>• Set enhancement text for each value (e.g., "Legendary" → "divine radiance, golden light")</li>
                    <li>• These enhancements are automatically added to generated prompts</li>
                    <li>• Perfect for art style, quality, or effect variations</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              💡 <strong>Tip:</strong> Enhancements are added to the positive prompt automatically
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  saveTemplates()
                  onClose()
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save & Close
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
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