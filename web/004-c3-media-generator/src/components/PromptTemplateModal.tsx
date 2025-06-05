import { useState, useMemo } from 'react'
import { X, Eye, FileText, Code, Sparkles, Edit, Save, RotateCcw, Copy, Plus, Settings } from 'lucide-react'
import { useCSVStore } from '../stores/csvStore'
import { useTemplateStore } from '../stores/templateStore'
import { TemplateGenerator } from '../lib/core/templateGenerator'
import { createPromptForCard } from '../lib/core/promptBuilder'
import ConditionalEnhancementModal from './ConditionalEnhancementModal'
import type { CardData, GenerationParams, DynamicPromptTemplate } from '../types'

interface PromptTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  sampleCard?: CardData
  params: GenerationParams
}

export default function PromptTemplateModal({ isOpen, onClose, sampleCard, params }: PromptTemplateModalProps) {
  const { 
    dynamicAnalysis, 
    flexibleMapping, 
    generatedTemplate, 
    validatedCards,
    useDynamicSystem 
  } = useCSVStore()
  
  const {
    currentTemplates,
    savedTemplates,
    isEditing,
    hasUnsavedChanges,
    conditionalEnhancements,
    startEditing,
    stopEditing,
    updateTemplate,
    saveTemplates,
    resetTemplates,
    getEffectiveTemplates
  } = useTemplateStore()
  
  const [activeTab, setActiveTab] = useState<'template' | 'preview' | 'editor' | 'conditionals'>('template')
  const [showConditionalModal, setShowConditionalModal] = useState(false)
  
  // Get available variables from actual CSV data
  const availableVariables = useMemo(() => {
    if (!useDynamicSystem || !dynamicAnalysis) {
      return []
    }
    
    return dynamicAnalysis.columns.map(column => ({
      name: column.name,
      type: column.type,
      sampleValues: column.sampleValues,
      uniqueCount: column.uniqueCount,
      isCore: Object.keys(flexibleMapping?.coreFields || {}).some(field => 
        flexibleMapping?.coreFields[field as keyof typeof flexibleMapping.coreFields]?.sourceColumn === column.name
      )
    }))
  }, [dynamicAnalysis, flexibleMapping, useDynamicSystem])
  
  // Get a real sample card from the validated data
  const realSampleCard = useMemo(() => {
    if (sampleCard) return sampleCard
    if (validatedCards && validatedCards.length > 0) {
      return validatedCards[0]
    }
    return null
  }, [sampleCard, validatedCards])
  
  // Generate preview using the dynamic template system
  const previewPrompt = useMemo(() => {
    if (!realSampleCard) return null
    
    // Use effective templates (current if editing, saved if not)
    const templateToUse = getEffectiveTemplates()
    
    // Use the same prompt building logic as actual generation
    // This ensures the preview matches exactly what will be generated
    return createPromptForCard(
      realSampleCard, 
      params, 
      templateToUse, 
      conditionalEnhancements
    )
  }, [realSampleCard, params, currentTemplates, savedTemplates, isEditing, conditionalEnhancements])
  
  // Helper function for simple variable replacement - now only used for fallback cases
  const replaceVariables = (template: string, cardData: any): string => {
    let result = template
    
    // Replace all {variableName} patterns with actual data
    Object.entries(cardData).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value || ''))
    })
    
    // Remove any unreplaced variables
    result = result.replace(/\{[^}]+\}/g, '')
    
    return result.trim()
  }
  
  if (!isOpen) return null
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }
  
  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`
    copyToClipboard(variable)
    // You could also implement direct insertion into the textarea if needed
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-[#FF7E06]" />
            <h2 className="text-xl font-bold text-white">Prompt Template System</h2>
            {useDynamicSystem && (
              <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded-full">
                Dynamic Mode
              </span>
            )}
            {isEditing && (
              <span className="px-2 py-1 bg-amber-900/20 text-amber-400 text-xs rounded-full">
                Editing
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'editor' && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={stopEditing}
                      className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTemplates}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditing}
                    className="px-3 py-1 text-sm bg-[#FF7E06] text-white rounded hover:bg-[#e06b00] flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit Templates
                  </button>
                )}
                <button
                  onClick={resetTemplates}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full">
              <X className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'template'
                ? 'border-b-2 border-[#FF7E06] text-[#FF7E06]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              1. Variables & Structure
            </div>
          </button>
          <button
            onClick={() => setActiveTab('conditionals')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'conditionals'
                ? 'border-b-2 border-purple-500 text-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              2. Conditional Enhancements
            </div>
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'editor'
                ? 'border-b-2 border-green-500 text-green-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              3. Edit Templates
            </div>
          </button>
          {realSampleCard && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'preview'
                  ? 'border-b-2 border-[#FF7E06] text-[#FF7E06]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                4. Live Preview
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'template' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Current Positive Prompt Template
                </h3>
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-600">
                  <code className="text-sm text-green-300 whitespace-pre-wrap break-words">
                    {getEffectiveTemplates().positive}
                  </code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  Current Negative Prompt Template
                </h3>
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-600">
                  <code className="text-sm text-red-300 break-words">
                    {getEffectiveTemplates().negative}
                  </code>
                </div>
              </div>

              {useDynamicSystem && availableVariables.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Available CSV Variables</h3>
                  <div className="space-y-3">
                    {availableVariables.map((variable, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        variable.isCore 
                          ? 'bg-[#FF7E06]/10 border-[#FF7E06]/30' 
                          : 'bg-gray-700 border-gray-600'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <code className={`text-sm font-mono px-2 py-1 rounded ${
                              variable.isCore 
                                ? 'bg-[#FF7E06] text-white' 
                                : 'bg-gray-600 text-gray-200'
                            }`}>
                              {`{${variable.name}}`}
                            </code>
                            <span className={`text-xs px-2 py-1 rounded ${
                              variable.type === 'text' ? 'bg-green-900/20 text-green-400' :
                              variable.type === 'enum' ? 'bg-purple-900/20 text-purple-400' :
                              'bg-amber-900/20 text-amber-400'
                            }`}>
                              {variable.type}
                            </span>
                            {variable.isCore && (
                              <span className="text-xs px-2 py-1 bg-yellow-900/20 text-yellow-400 rounded">
                                Core Field
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => insertVariable(variable.name)}
                            className="text-xs px-2 py-1 bg-[#FF7E06] text-white rounded hover:bg-[#e06b00] flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <div className="text-sm text-gray-300">
                          <strong>Sample values:</strong> {variable.sampleValues.slice(0, 3).join(', ')}
                          {variable.sampleValues.length > 3 && '...'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {variable.uniqueCount} unique values in your CSV
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Enhancements Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5 text-purple-400" />
                    Conditional Enhancements
                  </h3>
                  <button
                    onClick={() => setShowConditionalModal(true)}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Enhancements
                  </button>
                </div>
                
                {Object.keys(conditionalEnhancements).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(conditionalEnhancements).map(([column, enhancements]) => (
                      <div key={column} className="bg-purple-900/20 p-4 rounded-lg border border-purple-600">
                        <h4 className="font-medium text-purple-300 mb-2">
                          {column} Values
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(enhancements).map(([value, enhancement]) => (
                            enhancement && (
                              <div key={value} className="flex items-center gap-2 text-sm">
                                <span className="bg-gray-600 text-gray-200 px-2 py-1 rounded border border-gray-500 font-medium">
                                  {value}
                                </span>
                                <span className="text-purple-400">→</span>
                                <span className="text-purple-300 italic">
                                  "{enhancement}"
                                </span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-300 bg-[#FF7E06]/10 p-3 rounded border border-[#FF7E06]/30">
                      <strong>💡 How it works:</strong> These enhancements are automatically added to the positive prompt 
                      based on your card's attribute values. For example, if a card has rarity "Legendary", 
                      the corresponding enhancement text will be appended to improve image quality.
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700 p-6 rounded-lg border-2 border-dashed border-gray-600 text-center">
                    <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 mb-2">No conditional enhancements configured</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Set up attribute-based prompt enhancements to automatically improve your images based on CSV values like rarity or card type.
                    </p>
                    <button
                      onClick={() => setShowConditionalModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add Conditional Enhancements
                    </button>
                  </div>
                )}
              </div>

              {generatedTemplate?.conditionals && generatedTemplate.conditionals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Conditional Enhancements</h3>
                  <div className="space-y-2">
                    {generatedTemplate.conditionals.map((conditional, index) => (
                      <div key={index} className="bg-purple-900/20 p-3 rounded-lg border border-purple-600">
                        <div className="flex items-center gap-2 text-sm">
                          <code className="bg-purple-600 text-white px-2 py-1 rounded">
                            {conditional.condition}
                          </code>
                          <span className="text-purple-400">→</span>
                          <span className="text-purple-300">"{conditional.enhancement}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'conditionals' && (
            <div className="space-y-6">
              <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-600">
                <h3 className="font-semibold text-purple-300 mb-2">Conditional Enhancements</h3>
                <p className="text-sm text-purple-200">
                  Create dynamic prompts that change based on your CSV data. For example, make "Legendary" cards get "divine radiance, golden light" while "Common" cards get basic styling.
                </p>
              </div>

              {useDynamicSystem && availableVariables.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Panel: CSV Variables */}
                  <div>
                    <h4 className="font-medium text-white mb-3">Available CSV Variables</h4>
                    <div className="space-y-3">
                      {availableVariables
                        .filter(variable => variable.type === 'enum' || variable.uniqueCount <= 10)
                        .map((variable, index) => (
                        <div key={index} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-sm font-mono px-2 py-1 bg-gray-600 text-gray-200 rounded">
                              {variable.name}
                            </code>
                            <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded">
                              {variable.uniqueCount} values
                            </span>
                          </div>
                          <div className="text-sm text-gray-300 mb-3">
                            <strong>Values:</strong> {variable.sampleValues.join(', ')}
                            {variable.sampleValues.length < variable.uniqueCount && '...'}
                          </div>
                          
                          {/* Show current enhancements for this variable */}
                          {conditionalEnhancements[variable.name] ? (
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-purple-400">Current Enhancements:</h5>
                              {Object.entries(conditionalEnhancements[variable.name]).map(([value, enhancement]) => (
                                enhancement && (
                                  <div key={value} className="flex items-center gap-2 text-xs p-2 bg-purple-900/20 rounded">
                                    <span className="font-medium text-white">{value}:</span>
                                    <span className="text-purple-300 italic">"{enhancement}"</span>
                                  </div>
                                )
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">
                              No enhancements configured for this variable
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Panel: Enhancement Configuration */}
                  <div>
                    <h4 className="font-medium text-white mb-3">Configure Enhancements</h4>
                    <div className="bg-[#FF7E06]/10 p-4 rounded-lg border border-[#FF7E06]/30 mb-4">
                      <h5 className="font-medium text-[#FF7E06] mb-2">💡 How it works:</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Select a CSV variable (like "rarity")</li>
                        <li>• Set enhancement text for each value</li>
                        <li>• Enhancements are automatically added to prompts</li>
                        <li>• Perfect for quality, style, or effect variations</li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={() => setShowConditionalModal(true)}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Open Enhanced Editor
                    </button>
                    
                    <div className="mt-4 p-3 bg-amber-900/20 border border-amber-600 rounded-lg">
                      <p className="text-sm text-amber-300 font-medium">Pro Tip:</p>
                      <p className="text-xs text-amber-200 mt-1">
                        Use conditional enhancements to automatically adjust art style based on card properties. 
                        For example, Epic cards can get "powerful energy effects" while Common cards stay simple.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700 p-8 rounded-lg text-center border-2 border-dashed border-gray-600">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No CSV Data Available</h3>
                  <p className="text-sm text-gray-400">
                    Upload a CSV file to configure conditional enhancements based on your data values.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="bg-[#FF7E06]/10 p-4 rounded-lg border border-[#FF7E06]/30">
                <h3 className="font-semibold text-[#FF7E06] mb-2">Template Editor</h3>
                <p className="text-sm text-gray-300">
                  Customize your prompt templates using variables from your CSV. Click any variable below to copy it to your clipboard.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Positive Prompt Template
                </label>
                <textarea
                  value={getEffectiveTemplates().positive}
                  onChange={(e) => updateTemplate('positive', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full h-32 px-3 py-2 border rounded-lg text-sm font-mono ${
                    isEditing 
                      ? 'border-green-500 bg-gray-700 text-white focus:border-green-400 focus:ring-2 focus:ring-green-500/20' 
                      : 'border-gray-600 bg-gray-700 text-gray-300'
                  }`}
                  placeholder="Enter your positive prompt template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Negative Prompt Template
                </label>
                <textarea
                  value={getEffectiveTemplates().negative}
                  onChange={(e) => updateTemplate('negative', e.target.value)}
                  disabled={!isEditing}
                  className={`w-full h-24 px-3 py-2 border rounded-lg text-sm font-mono ${
                    isEditing 
                      ? 'border-red-500 bg-gray-700 text-white focus:border-red-400 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-gray-600 bg-gray-700 text-gray-300'
                  }`}
                  placeholder="Enter your negative prompt template..."
                />
              </div>

              {useDynamicSystem && availableVariables.length > 0 && (
                <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600">
                  <h4 className="font-medium text-yellow-300 mb-2">Available Variables:</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {availableVariables.map((variable, index) => (
                      <button
                        key={index}
                        onClick={() => insertVariable(variable.name)}
                        className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded text-white text-left transition-colors"
                      >
                        {`{${variable.name}}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-200 mt-2">
                    Click the variables above to copy them to your clipboard for easy insertion.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && realSampleCard && previewPrompt && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">Live Preview for "{realSampleCard.name}"</h3>
                <p className="text-gray-300 mb-4">
                  This shows exactly how the prompts will be generated for this card using your current templates:
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Generated Positive Prompt
                  </h4>
                  <div className="bg-green-900/20 p-4 rounded-lg border border-green-600">
                    <div className="text-sm text-green-300 whitespace-pre-wrap font-mono break-words">
                      {previewPrompt.positive}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    Generated Negative Prompt
                  </h4>
                  <div className="bg-red-900/20 p-4 rounded-lg border border-red-600">
                    <div className="text-sm text-red-300 font-mono break-words">
                      {previewPrompt.negative}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-[#FF7E06] mb-2">Variable Substitutions</h4>
                  <div className="bg-[#FF7E06]/10 p-4 rounded-lg border border-[#FF7E06]/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {Object.entries(realSampleCard).map(([key, value]) => (
                        <div key={key}>
                          <strong className="capitalize">{key}:</strong> {String(value).substring(0, 50)}
                          {String(value).length > 50 && '...'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {isEditing 
                ? "⚠️ You have unsaved changes to your prompt templates"
                : useDynamicSystem 
                  ? "💡 Templates are automatically generated from your CSV structure"
                  : "💡 Customize your prompt templates to get exactly the style you want"
              }
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Conditional Enhancement Modal */}
      <ConditionalEnhancementModal
        isOpen={showConditionalModal}
        onClose={() => setShowConditionalModal(false)}
      />
    </div>
  )
} 