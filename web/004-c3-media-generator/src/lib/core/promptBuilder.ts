import type { CardData, GenerationParams } from '../../types'

// Default templates - only used if no custom templates exist
const DEFAULT_TEMPLATES = {
  positive: "{name}, {description}, detailed digital art, fantasy style, high quality",
  negative: "blurry, low quality, distorted, deformed, text, watermark"
}

interface CustomTemplates {
  positive: string
  negative: string
}

interface ConditionalEnhancement {
  [attributeValue: string]: string
}

interface ConditionalEnhancements {
  [csvColumn: string]: ConditionalEnhancement
}

export interface PromptData {
  positive: string
  negative: string
  seed: number
}

// Card type specific prompts (simplified from your config)
const CARD_TYPE_PROMPTS = {
  Fighter: {
    image_prompts: [
      "fierce warrior wielding {weapon}",
      "battle-scarred combatant in {armor}",
      "grim fighter with {weapon} raised",
      "veteran warrior in combat stance",
      "intimidating pit fighter with scars"
    ],
    weapons: ["sword", "axe", "mace", "dagger", "hammer", "spear", "club"],
    armor: ["leather armor", "chainmail", "plate armor", "studded leather", "battle-worn gear"]
  },
  Spell: {
    image_prompts: [
      "magical energy swirling with {element} effects",
      "arcane symbols glowing with {element} power",
      "mystical {element} magic crackling",
      "spell effects with {element} energy",
      "magical aura of {element} power"
    ],
    elements: ["fire", "ice", "lightning", "shadow", "light", "earth", "wind"]
  },
  Equipment: {
    image_prompts: [
      "ornate {item_type} with intricate details",
      "masterwork {item_type} gleaming",
      "enchanted {item_type} with magical aura",
      "ancient {item_type} of power",
      "legendary {item_type} artifact"
    ],
    item_types: ["weapon", "armor", "shield", "amulet", "ring", "boots", "helmet"]
  }
}

/**
 * Creates prompts for a card using proper variable replacement and conditional enhancements
 * This function now respects user template edits and handles all CSV variables
 * It also supports workflow-specific prompt mapping for video and other workflow types
 */
export function createPromptForCard(
  card: CardData, 
  params: GenerationParams, 
  templates: CustomTemplates = DEFAULT_TEMPLATES,
  conditionalEnhancements: ConditionalEnhancements = {},
  workflowPromptNodes?: Array<{
    nodeId: string
    inputName: string
    isPositivePrompt: boolean
    isNegativePrompt: boolean
  }>
): PromptData {
  
  // Choose the appropriate template system
  // If workflow has prompt nodes, use the first positive prompt node's content as template
  let positiveTemplate = templates.positive
  let negativeTemplate = templates.negative
  
  if (workflowPromptNodes && workflowPromptNodes.length > 0) {
    const positiveNode = workflowPromptNodes.find(node => node.isPositivePrompt)
    const negativeNode = workflowPromptNodes.find(node => node.isNegativePrompt)
    
    // For workflow-based generation, we'll still use the templates but adapt them
    // The actual workflow parameter replacement happens in the workflow execution
    console.log(`🎬 Using workflow-based prompts (${workflowPromptNodes.length} prompt nodes detected)`)
  }
  
  // Apply variable replacement to templates
  // Users have full control - only replace variables they explicitly included
  const processedPositive = replaceVariables(positiveTemplate, card, conditionalEnhancements)
  const processedNegative = replaceVariables(negativeTemplate, card, conditionalEnhancements)
  
  // Generate or use existing seed
  const seed = params.seed || Math.floor(Math.random() * 4294967295)
  
  return {
    positive: processedPositive,
    negative: processedNegative,
    seed
  }
}

/**
 * Replace template variables with actual card data and apply conditional enhancements
 * Only replaces variables that users explicitly included in their templates
 * No automatic appending - users have full control
 */
function replaceVariables(
  template: string, 
  cardData: CardData, 
  conditionalEnhancements: ConditionalEnhancements
): string {
  let result = template
  
  // Replace all CSV column variables with enhanced values if available, otherwise raw values
  Object.entries(cardData).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    
    if (regex.test(result)) {
      // Check if there's a conditional enhancement for this variable
      const enhancementMap = conditionalEnhancements[key]
      let replacementValue = String(value)
      
      if (enhancementMap && enhancementMap[String(value)]) {
        // Use the enhanced value instead of raw CSV value
        replacementValue = enhancementMap[String(value)]
        console.log(`🎨 Using enhanced value for {${key}}: "${String(value)}" → "${replacementValue}"`)
      }
      
      result = result.replace(regex, replacementValue)
    }
  })
  
  return result
}

/**
 * Generate a consistent seed based on card name
 */
function generateSeed(name: string): number {
  let seed = 0
  for (let i = 0; i < name.length; i++) {
    seed += name.charCodeAt(i)
  }
  return Math.abs(seed) % 1000000 // Keep seed in reasonable range
}

/**
 * Get current templates from localStorage or defaults
 * This ensures we always use the user's saved templates
 */
export function getCurrentTemplates(): CustomTemplates {
  try {
    const saved = localStorage.getItem('custom-prompt-templates')
    if (saved) {
      const parsed = JSON.parse(saved)
      
      // Handle both old format (just templates) and new format (templates + conditional enhancements)
      if (parsed.templates) {
        console.log('📖 Loaded custom templates from localStorage (new format)')
        return parsed.templates
      } else {
        console.log('📖 Loaded custom templates from localStorage (old format)')
        return parsed
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load custom templates:', error)
  }
  
  console.log('📖 Using default templates')
  return DEFAULT_TEMPLATES
}

/**
 * Get current conditional enhancements from localStorage
 */
export function getCurrentConditionalEnhancements(): ConditionalEnhancements {
  try {
    const saved = localStorage.getItem('custom-prompt-templates')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.conditionalEnhancements) {
        console.log('📖 Loaded conditional enhancements from localStorage')
        return parsed.conditionalEnhancements
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load conditional enhancements:', error)
  }
  
  console.log('📖 Using default conditional enhancements')
  return {}
}

/**
 * Save templates to localStorage
 */
export function saveTemplates(templates: CustomTemplates): void {
  try {
    localStorage.setItem('custom-prompt-templates', JSON.stringify(templates))
    console.log('💾 Saved custom templates to localStorage')
  } catch (error) {
    console.error('❌ Failed to save templates:', error)
  }
}

function selectRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function createDescriptionContext(description: string): string {
  // Extract key descriptive words and themes
  const words = description.toLowerCase().split(/\s+/)
  const descriptiveWords = words.filter(word => 
    word.length > 4 && 
    !['the', 'and', 'with', 'from', 'that', 'this', 'have', 'they', 'been', 'were', 'are'].includes(word)
  )
  
  return descriptiveWords.slice(0, 3).join(', ')
}

function createFluffContext(flavorText: string): string {
  // Extract mood and atmosphere from flavor text
  const emotiveWords = flavorText.toLowerCase().match(/\b(dark|grim|fierce|powerful|ancient|mystical|brutal|savage|noble|cursed|blessed|vengeful|wise|cunning)\b/g)
  return emotiveWords ? emotiveWords.slice(0, 2).join(', ') : ""
}

function generateImagePrompt(cardType: string): string {
  const cardTypeConfig = CARD_TYPE_PROMPTS[cardType as keyof typeof CARD_TYPE_PROMPTS] || CARD_TYPE_PROMPTS.Fighter
  
  // Select random elements
  const imagePrompt = selectRandom(cardTypeConfig.image_prompts)
  
  // Replace placeholders in image prompt
  let finalImagePrompt = imagePrompt
  if ('weapons' in cardTypeConfig) {
    finalImagePrompt = finalImagePrompt.replace('{weapon}', selectRandom(cardTypeConfig.weapons))
    finalImagePrompt = finalImagePrompt.replace('{armor}', selectRandom(cardTypeConfig.armor))
  }
  if ('elements' in cardTypeConfig) {
    finalImagePrompt = finalImagePrompt.replace('{element}', selectRandom(cardTypeConfig.elements))
  }
  if ('item_types' in cardTypeConfig) {
    finalImagePrompt = finalImagePrompt.replace('{item_type}', selectRandom(cardTypeConfig.item_types))
  }
  
  return finalImagePrompt
}

function extractDescriptionContext(description: string): string {
  // Extract key descriptive words and themes
  const words = description.toLowerCase().split(/\s+/)
  const descriptiveWords = words.filter(word => 
    word.length > 4 && 
    !['the', 'and', 'with', 'from', 'that', 'this', 'have', 'they', 'been', 'were', 'are'].includes(word)
  )
  
  return descriptiveWords.slice(0, 3).join(', ')
}

function extractFluffContext(flavorText: string): string {
  // Extract mood and atmosphere from flavor text
  const emotiveWords = flavorText.toLowerCase().match(/\b(dark|grim|fierce|powerful|ancient|mystical|brutal|savage|noble|cursed|blessed|vengeful|wise|cunning)\b/g)
  return emotiveWords ? emotiveWords.slice(0, 2).join(', ') : ""
} 