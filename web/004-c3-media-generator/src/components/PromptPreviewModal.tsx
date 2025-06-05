import { useState, useMemo } from 'react'
import { X, Eye, Search, Edit3, RefreshCw } from 'lucide-react'
import { useCSVStore } from '../stores/csvStore'
import { useTemplateStore } from '../stores/templateStore'
import { createPromptForCard } from '../lib/core/promptBuilder'
import type { CardData, GenerationParams } from '../types'

interface PromptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  cards: CardData[]
  params: GenerationParams
  onEditPrompt?: (cardIndex: number, positive: string, negative: string) => void
}

interface PreviewCard extends CardData {
  promptData: {
    positive: string
    negative: string
    seed: number
  }
  isEdited?: boolean
}

export default function PromptPreviewModal({ 
  isOpen, 
  onClose, 
  cards, 
  params, 
  onEditPrompt 
}: PromptPreviewModalProps) {
  const { getEffectiveTemplates, conditionalEnhancements } = useTemplateStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<number, { positive: string; negative: string }>>({})

  // Helper function for simple variable replacement (fallback)
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

  // Generate preview data for all cards
  const previewCards: PreviewCard[] = useMemo(() => {
    // Get templates from the centralized template store
    const currentTemplates = getEffectiveTemplates()
    
    console.log('🔍 Preview Modal - Using templates:', currentTemplates)
    console.log('🔍 Preview Modal - Using conditional enhancements:', conditionalEnhancements)
    
    return cards.map((card, index) => {
      const edited = editedPrompts[index]
      
      if (edited) {
        return {
          ...card,
          promptData: {
            positive: edited.positive,
            negative: edited.negative,
            seed: 1587 // Default seed
          },
          isEdited: true
        }
      }
      
      // Use the centralized prompt builder with conditional enhancements
      const promptData = createPromptForCard(card, params, currentTemplates, conditionalEnhancements)
      
      console.log(`🎯 Generated preview for ${card.name}:`, {
        positive: promptData.positive.slice(0, 100) + '...',
        negative: promptData.negative.slice(0, 50) + '...',
        hasEnhancements: Object.keys(conditionalEnhancements).length > 0
      })
      
      return {
        ...card,
        promptData,
        isEdited: false
      }
    })
  }, [cards, params, editedPrompts, getEffectiveTemplates, conditionalEnhancements])

  // Filter cards based on search
  const filteredCards = useMemo(() => {
    if (!searchTerm) return previewCards.slice(0, 20) // Show first 20 by default
    
    return previewCards.filter(card => 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.card_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.rarity.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 50) // Limit to 50 for performance
  }, [previewCards, searchTerm])

  const handleEditPrompt = (cardIndex: number, positive: string, negative: string) => {
    setEditedPrompts(prev => ({
      ...prev,
      [cardIndex]: { positive, negative }
    }))
    
    // Call parent callback if provided
    onEditPrompt?.(cardIndex, positive, negative)
  }

  const resetPrompt = (cardIndex: number) => {
    setEditedPrompts(prev => {
      const newEdited = { ...prev }
      delete newEdited[cardIndex]
      return newEdited
    })
  }

  const resetAllPrompts = () => {
    setEditedPrompts({})
  }

  if (!isOpen) return null

  const selectedCard = selectedCardIndex !== null ? previewCards[selectedCardIndex] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-[#FF7E06]" />
            <h2 className="text-xl font-bold text-white">Preview Generated Prompts</h2>
            <span className="text-sm text-gray-400">
              ({filteredCards.length} of {cards.length} cards shown)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(editedPrompts).length > 0 && (
              <button
                onClick={resetAllPrompts}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1 border border-gray-600"
              >
                <RefreshCw className="h-3 w-3" />
                Reset All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-[80vh]">
          {/* Left Panel - Card List */}
          <div className="w-1/2 border-r border-gray-700">
            {/* Search */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-sm placeholder-gray-400"
                />
              </div>
            </div>

            {/* Card List */}
            <div className="overflow-y-auto h-full p-4 space-y-2 bg-gray-800">
              {filteredCards.map((card) => {
                const originalIndex = cards.findIndex(c => c.uuid === card.uuid)
                return (
                  <div
                    key={card.uuid}
                    onClick={() => setSelectedCardIndex(originalIndex)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCardIndex === originalIndex
                        ? 'border-[#FF7E06] bg-orange-900/20'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate text-white">{card.name}</h3>
                      <div className="flex items-center gap-1">
                        {card.isEdited && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full" title="Edited" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          card.rarity === 'Common' ? 'bg-gray-700 text-gray-300' :
                          card.rarity === 'Uncommon' ? 'bg-green-900/20 text-green-400 border border-green-600' :
                          card.rarity === 'Rare' ? 'bg-blue-900/20 text-blue-400 border border-blue-600' :
                          card.rarity === 'Epic' ? 'bg-purple-900/20 text-purple-400 border border-purple-600' :
                          card.rarity === 'Legendary' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-600' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {card.rarity}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="bg-gray-700 px-2 py-1 rounded mr-2 text-gray-300">{card.card_type}</span>
                      {card.description.slice(0, 60)}...
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Panel - Prompt Details */}
          <div className="w-1/2 flex flex-col bg-gray-800">
            {selectedCard ? (
              <>
                {/* Card Info */}
                <div className="p-4 border-b border-gray-700 bg-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-white">{selectedCard.name}</h3>
                    {selectedCard.isEdited && (
                      <button
                        onClick={() => resetPrompt(selectedCardIndex!)}
                        className="px-2 py-1 text-xs bg-orange-900/20 text-orange-400 rounded hover:bg-orange-900/30 flex items-center gap-1 border border-orange-600"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong className="text-gray-300">Type:</strong> <span className="text-white">{selectedCard.card_type}</span>
                    </div>
                    <div>
                      <strong className="text-gray-300">Rarity:</strong> <span className="text-white">{selectedCard.rarity}</span>
                    </div>
                    <div className="col-span-2">
                      <strong className="text-gray-300">Description:</strong> <span className="text-white">{selectedCard.description}</span>
                    </div>
                    {selectedCard.flavor_text && (
                      <div className="col-span-2">
                        <strong className="text-gray-300">Flavor:</strong> <em className="text-gray-200">{selectedCard.flavor_text}</em>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prompts */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Positive Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Positive Prompt
                      </h4>
                      <button
                        onClick={() => {
                          const newPrompt = prompt("Edit positive prompt:", selectedCard.promptData.positive)
                          if (newPrompt !== null && selectedCardIndex !== null) {
                            handleEditPrompt(selectedCardIndex, newPrompt, selectedCard.promptData.negative)
                          }
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-[#FF7E06]"
                        title="Edit prompt"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-lg border border-green-600">
                      <div className="text-sm text-green-300 whitespace-pre-wrap font-mono">
                        {selectedCard.promptData.positive}
                      </div>
                    </div>
                  </div>

                  {/* Negative Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-red-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        Negative Prompt
                      </h4>
                      <button
                        onClick={() => {
                          const newPrompt = prompt("Edit negative prompt:", selectedCard.promptData.negative)
                          if (newPrompt !== null && selectedCardIndex !== null) {
                            handleEditPrompt(selectedCardIndex, selectedCard.promptData.positive, newPrompt)
                          }
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-[#FF7E06]"
                        title="Edit prompt"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="bg-red-900/20 p-3 rounded-lg border border-red-600">
                      <div className="text-sm text-red-300 font-mono">
                        {selectedCard.promptData.negative}
                      </div>
                    </div>
                  </div>

                  {/* Generation Parameters */}
                  <div>
                    <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Generation Parameters
                    </h4>
                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-600">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong className="text-gray-300">Width:</strong> <span className="text-white">{params.width}px</span></div>
                        <div><strong className="text-gray-300">Height:</strong> <span className="text-white">{params.height}px</span></div>
                        <div><strong className="text-gray-300">Steps:</strong> <span className="text-white">{params.steps}</span></div>
                        <div><strong className="text-gray-300">Guidance:</strong> <span className="text-white">{params.guidance}</span></div>
                        <div><strong className="text-gray-300">Seed:</strong> <span className="text-white">{selectedCard.promptData.seed}</span></div>
                        <div><strong className="text-gray-300">Model:</strong> <span className="text-white">{params.model}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">Select a card to preview its generated prompts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              <div className="flex items-center gap-4">
                <span className="text-gray-300">💡 <strong>Tip:</strong> Review prompts to ensure they match your expectations</span>
                {Object.keys(editedPrompts).length > 0 && (
                  <span className="text-orange-400">
                    ⚠️ {Object.keys(editedPrompts).length} prompts have been edited
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 border border-gray-600"
              >
                Close Preview
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00]"
              >
                Start Generation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 