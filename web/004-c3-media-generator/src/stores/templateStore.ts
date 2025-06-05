import { create } from 'zustand'

interface TemplateState {
  positive: string
  negative: string
}

// Conditional enhancements for CSV attributes
interface ConditionalEnhancement {
  [attributeValue: string]: string // e.g., "Legendary": "divine radiance, golden light"
}

interface ConditionalEnhancements {
  [csvColumn: string]: ConditionalEnhancement // e.g., "rarity": { "Legendary": "...", "Rare": "..." }
}

interface TemplateStore {
  // Current template state (including unsaved edits)
  currentTemplates: TemplateState
  
  // Saved template state (from localStorage)
  savedTemplates: TemplateState
  
  // Conditional enhancements
  conditionalEnhancements: ConditionalEnhancements
  
  // Flags
  isEditing: boolean
  hasUnsavedChanges: boolean
  
  // Actions
  startEditing: () => void
  stopEditing: () => void
  updateTemplate: (field: 'positive' | 'negative', value: string) => void
  saveTemplates: () => void
  resetTemplates: () => void
  loadTemplatesFromStorage: () => void
  
  // Conditional enhancement actions
  setConditionalEnhancement: (csvColumn: string, attributeValue: string, enhancement: string) => void
  removeConditionalEnhancement: (csvColumn: string, attributeValue?: string) => void
  getConditionalEnhancement: (csvColumn: string, attributeValue: string) => string | undefined
  
  // Computed
  getEffectiveTemplates: () => TemplateState
}

// Default templates
const DEFAULT_TEMPLATES: TemplateState = {
  positive: "{name}, {description}, detailed digital art, fantasy style, high quality, use {rarity} as main styling color",
  negative: "blurry, low quality, distorted, deformed, text, watermark"
}

// Default conditional enhancements
const DEFAULT_CONDITIONAL_ENHANCEMENTS: ConditionalEnhancements = {
  // Start with empty conditional enhancements - users can add their own
  // This prevents conflicts with user-defined enhancements
  
  // Example starter enhancements that users can edit or remove
  rarity: {
    "Common": "Grayish tints dull colouring",
    "Uncommon": "Green glowing effects",
    "Rare": "Blue glowing effects, radiant effects",
    "Epic": "Red glowing effects, powerful magical energy",
    "Legendary": "Golden glowing effects, otherworldly power, epic proportions"
  }
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  // Initial state
  currentTemplates: DEFAULT_TEMPLATES,
  savedTemplates: DEFAULT_TEMPLATES,
  conditionalEnhancements: DEFAULT_CONDITIONAL_ENHANCEMENTS,
  isEditing: false,
  hasUnsavedChanges: false,

  startEditing: () => {
    const { savedTemplates } = get()
    set({
      isEditing: true,
      currentTemplates: { ...savedTemplates }, // Copy saved templates to current
      hasUnsavedChanges: false
    })
  },

  stopEditing: () => {
    const { savedTemplates } = get()
    set({
      isEditing: false,
      currentTemplates: { ...savedTemplates }, // Reset to saved templates
      hasUnsavedChanges: false
    })
  },

  updateTemplate: (field: 'positive' | 'negative', value: string) => {
    const { currentTemplates, savedTemplates } = get()
    const newTemplates = { ...currentTemplates, [field]: value }
    
    // Check if templates have changed from saved version
    const hasChanges = (
      newTemplates.positive !== savedTemplates.positive ||
      newTemplates.negative !== savedTemplates.negative
    )
    
    set({
      currentTemplates: newTemplates,
      hasUnsavedChanges: hasChanges
    })
  },

  saveTemplates: () => {
    const { currentTemplates, conditionalEnhancements } = get()
    
    try {
      const dataToSave = {
        templates: currentTemplates,
        conditionalEnhancements
      }
      localStorage.setItem('custom-prompt-templates', JSON.stringify(dataToSave))
      
      set({
        savedTemplates: { ...currentTemplates },
        hasUnsavedChanges: false,
        isEditing: false
      })
      
      console.log('💾 Templates and conditional enhancements saved to localStorage')
    } catch (error) {
      console.error('❌ Failed to save templates:', error)
    }
  },

  resetTemplates: () => {
    set({
      currentTemplates: { ...DEFAULT_TEMPLATES },
      savedTemplates: { ...DEFAULT_TEMPLATES },
      conditionalEnhancements: { ...DEFAULT_CONDITIONAL_ENHANCEMENTS },
      hasUnsavedChanges: false,
      isEditing: false
    })
    
    try {
      localStorage.removeItem('custom-prompt-templates')
      console.log('🗑️ Templates reset to defaults')
    } catch (error) {
      console.error('❌ Failed to clear templates from localStorage:', error)
    }
  },

  loadTemplatesFromStorage: () => {
    try {
      const saved = localStorage.getItem('custom-prompt-templates')
      if (saved) {
        const parsed = JSON.parse(saved)
        
        // Handle both old format (just templates) and new format (templates + conditional enhancements)
        if (parsed.templates) {
          // New format
          set({
            currentTemplates: { ...parsed.templates },
            savedTemplates: { ...parsed.templates },
            conditionalEnhancements: parsed.conditionalEnhancements || DEFAULT_CONDITIONAL_ENHANCEMENTS,
            hasUnsavedChanges: false
          })
        } else {
          // Old format - just templates
          set({
            currentTemplates: { ...parsed },
            savedTemplates: { ...parsed },
            conditionalEnhancements: DEFAULT_CONDITIONAL_ENHANCEMENTS,
            hasUnsavedChanges: false
          })
        }
        console.log('📖 Loaded templates from localStorage')
      } else {
        // No saved templates, use defaults
        set({
          currentTemplates: { ...DEFAULT_TEMPLATES },
          savedTemplates: { ...DEFAULT_TEMPLATES },
          conditionalEnhancements: DEFAULT_CONDITIONAL_ENHANCEMENTS,
          hasUnsavedChanges: false
        })
        console.log('📖 Using default templates (no saved templates found)')
      }
    } catch (error) {
      console.warn('⚠️ Failed to load templates from localStorage:', error)
      set({
        currentTemplates: { ...DEFAULT_TEMPLATES },
        savedTemplates: { ...DEFAULT_TEMPLATES },
        conditionalEnhancements: DEFAULT_CONDITIONAL_ENHANCEMENTS,
        hasUnsavedChanges: false
      })
    }
  },

  setConditionalEnhancement: (csvColumn: string, attributeValue: string, enhancement: string) => {
    const { conditionalEnhancements } = get()
    const newEnhancements = {
      ...conditionalEnhancements,
      [csvColumn]: {
        ...conditionalEnhancements[csvColumn],
        [attributeValue]: enhancement
      }
    }
    set({ conditionalEnhancements: newEnhancements })
  },

  removeConditionalEnhancement: (csvColumn: string, attributeValue?: string) => {
    const { conditionalEnhancements } = get()
    const newEnhancements = { ...conditionalEnhancements }
    
    if (attributeValue) {
      // Remove specific attribute value
      if (newEnhancements[csvColumn]) {
        delete newEnhancements[csvColumn][attributeValue]
      }
    } else {
      // Remove entire column
      delete newEnhancements[csvColumn]
    }
    
    set({ conditionalEnhancements: newEnhancements })
  },

  getConditionalEnhancement: (csvColumn: string, attributeValue: string) => {
    const { conditionalEnhancements } = get()
    return conditionalEnhancements[csvColumn]?.[attributeValue]
  },

  getEffectiveTemplates: () => {
    const { isEditing, currentTemplates, savedTemplates } = get()
    // Return current templates if editing (includes unsaved changes), otherwise return saved templates
    return isEditing ? currentTemplates : savedTemplates
  }
}))

// Initialize templates on store creation
useTemplateStore.getState().loadTemplatesFromStorage() 