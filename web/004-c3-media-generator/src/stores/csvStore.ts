import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Papa from 'papaparse'
import type { CardData, CSVFormat, ColumnMapping, ValidationResult, DynamicCSVAnalysis, FlexibleColumnMapping, DynamicPromptTemplate } from '../types/index'
import { SmartCSVDetector } from '../lib/core/smartCSVDetector'
import { TemplateGenerator } from '../lib/core/templateGenerator'
import { ExampleCSVLoader, type CSVExample } from '../lib/api/exampleCSVLoader'

interface CSVStore {
  // Legacy data (maintaining backward compatibility)
  rawData: any[] | null
  detectedFormat: CSVFormat | null
  columnMapping: ColumnMapping
  validatedCards: CardData[]
  fileName: string | null
  isProcessing: boolean
  
  // New dynamic system
  dynamicAnalysis: DynamicCSVAnalysis | null
  flexibleMapping: FlexibleColumnMapping | null
  generatedTemplate: DynamicPromptTemplate | null
  useDynamicSystem: boolean
  
  // Actions
  uploadCSV: (file: File) => Promise<void>
  loadExample: (example: CSVExample) => Promise<void>
  detectFormat: (data: any[]) => CSVFormat
  setColumnMapping: (mapping: ColumnMapping) => void
  validateData: () => ValidationResult
  
  // New dynamic actions
  setFlexibleMapping: (mapping: FlexibleColumnMapping) => void
  generateTemplate: (userPrefs?: Partial<DynamicPromptTemplate>) => void
  toggleDynamicSystem: (enabled: boolean) => void
  
  // Internal validation methods
  validateDynamicData: () => ValidationResult
  validateLegacyData: () => ValidationResult
  
  reset: () => void

  // New helper method for validating with specific mapping
  validateDynamicDataWithMapping: (rawData: any[], dynamicAnalysis: DynamicCSVAnalysis, flexibleMapping: FlexibleColumnMapping) => ValidationResult
}

const requiredFields = ['name', 'description', 'uuid', 'rarity', 'card_type']

export const useCSVStore = create<CSVStore>()(
  persist(
    (set, get) => ({
      // Initial state
      rawData: null,
      detectedFormat: null,
      columnMapping: {},
      validatedCards: [],
      fileName: null,
      isProcessing: false,
      
      // New dynamic state
      dynamicAnalysis: null,
      flexibleMapping: null,
      generatedTemplate: null,
      useDynamicSystem: true, // Default to new system
      
      // Actions
      uploadCSV: async (file: File) => {
        set({ isProcessing: true, fileName: file.name })
        
        return new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transform: (value: any) => value.trim(),
            complete: (results: any) => {
              if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors)
              }
              
              const { useDynamicSystem } = get()
              
              if (useDynamicSystem) {
                // Use new smart detection system
                const detector = new SmartCSVDetector()
                const dynamicAnalysis = detector.analyzeCSV(results.data)
                
                // Create initial flexible mapping from analysis
                const flexibleMapping: FlexibleColumnMapping = {
                  coreFields: {},
                  customVariables: [],
                  autoVariables: {}
                }
                
                // Map core fields based on suggestions
                if (dynamicAnalysis.suggestedMappings.prompt) {
                  flexibleMapping.coreFields.prompt = {
                    sourceColumn: dynamicAnalysis.suggestedMappings.prompt,
                    useAsBase: true
                  }
                }
                
                if (dynamicAnalysis.suggestedMappings.name) {
                  flexibleMapping.coreFields.name = {
                    sourceColumn: dynamicAnalysis.suggestedMappings.name,
                    includeInPrompt: true
                  }
                }
                
                if (dynamicAnalysis.suggestedMappings.description) {
                  flexibleMapping.coreFields.description = {
                    sourceColumn: dynamicAnalysis.suggestedMappings.description,
                    includeInPrompt: !dynamicAnalysis.suggestedMappings.prompt // Include if no explicit prompt
                  }
                }
                
                // Create auto-variables for all columns
                for (const column of dynamicAnalysis.columns) {
                  flexibleMapping.autoVariables[column.name] = column.name
                }
                
                // Generate initial template
                const templateGenerator = new TemplateGenerator()
                const generatedTemplate = templateGenerator.generateFromCSV(dynamicAnalysis, flexibleMapping)
                
                // Automatically validate and create valid cards for the dynamic system
                const validationResult = get().validateDynamicDataWithMapping(results.data, dynamicAnalysis, flexibleMapping)
                
                set({
                  rawData: results.data,
                  dynamicAnalysis,
                  flexibleMapping,
                  generatedTemplate,
                  validatedCards: validationResult.validCards,
                  isProcessing: false
                })
              } else {
                // Use legacy detection system
                const format = get().detectFormat(results.data)
                
                set({
                  rawData: results.data,
                  detectedFormat: format,
                  isProcessing: false
                })
              }
              
              resolve()
            },
            error: (error: any) => {
              set({ isProcessing: false })
              reject(error)
            }
          })
        })
      },

      // Load example CSV method
      loadExample: async (example: CSVExample) => {
        set({ isProcessing: true, fileName: example.fileName })
        
        try {
          const loader = ExampleCSVLoader.getInstance()
          const { data, analysis } = await loader.useExample(example)
          
          const { useDynamicSystem } = get()
          
          if (useDynamicSystem) {
            // Create initial flexible mapping from analysis
            const flexibleMapping: FlexibleColumnMapping = {
              coreFields: {},
              customVariables: [],
              autoVariables: {}
            }
            
            // Map core fields based on suggestions
            if (analysis.suggestedMappings.prompt) {
              flexibleMapping.coreFields.prompt = {
                sourceColumn: analysis.suggestedMappings.prompt,
                useAsBase: true
              }
            }
            
            if (analysis.suggestedMappings.name) {
              flexibleMapping.coreFields.name = {
                sourceColumn: analysis.suggestedMappings.name,
                includeInPrompt: true
              }
            }
            
            if (analysis.suggestedMappings.description) {
              flexibleMapping.coreFields.description = {
                sourceColumn: analysis.suggestedMappings.description,
                includeInPrompt: !analysis.suggestedMappings.prompt // Include if no explicit prompt
              }
            }
            
            // Create auto-variables for all columns
            for (const column of analysis.columns) {
              flexibleMapping.autoVariables[column.name] = column.name
            }
            
            // Generate initial template
            const templateGenerator = new TemplateGenerator()
            const generatedTemplate = templateGenerator.generateFromCSV(analysis, flexibleMapping)
            
            // Automatically validate and create valid cards for the dynamic system
            const validationResult = get().validateDynamicDataWithMapping(data, analysis, flexibleMapping)
            
            set({
              rawData: data,
              dynamicAnalysis: analysis,
              flexibleMapping,
              generatedTemplate,
              validatedCards: validationResult.validCards,
              isProcessing: false
            })
          } else {
            // Use legacy detection system
            const format = get().detectFormat(data)
            
            set({
              rawData: data,
              detectedFormat: format,
              isProcessing: false
            })
          }
        } catch (error) {
          set({ isProcessing: false })
          throw error
        }
      },

      // Legacy detection method (keeping for backward compatibility)
      detectFormat: (data: any[]) => {
        if (!data || data.length === 0) {
          return {
            delimiter: ',',
            hasHeader: true,
            encoding: 'utf-8',
            detectedColumns: {},
            confidence: 0
          }
        }

        const firstRow = data[0]
        const columns = Object.keys(firstRow)
        const detectedColumns: CSVFormat['detectedColumns'] = {}
        let confidence = 0

        // Try to match column names (case insensitive, flexible matching)
        for (const column of columns) {
          const lowerColumn = column.toLowerCase()
          
          // Exact matches first (common patterns)
          if (lowerColumn === 'name' || lowerColumn === 'title') {
            detectedColumns.name = column
            confidence += 0.2
          } else if (lowerColumn === 'description' || lowerColumn === 'desc') {
            detectedColumns.description = column
            confidence += 0.2
          } else if (lowerColumn === 'uuid' || lowerColumn === 'id') {
            detectedColumns.uuid = column
            confidence += 0.2
          } else if (lowerColumn === 'rarity') {
            detectedColumns.rarity = column
            confidence += 0.15
          } else if (lowerColumn === 'card_type' || lowerColumn === 'type' || lowerColumn === 'cardtype') {
            detectedColumns.card_type = column
            confidence += 0.15
          } else if (lowerColumn === 'flavor_text' || lowerColumn === 'flavor' || lowerColumn === 'fluff') {
            detectedColumns.flavor_text = column
            confidence += 0.1
          }
          // Partial matches for flexibility
          else if (lowerColumn.includes('name')) {
            detectedColumns.name = column
            confidence += 0.15
          } else if (lowerColumn.includes('description') || lowerColumn.includes('desc')) {
            detectedColumns.description = column
            confidence += 0.15
          } else if (lowerColumn.includes('uuid') || lowerColumn.includes('id')) {
            detectedColumns.uuid = column
            confidence += 0.15
          } else if (lowerColumn.includes('rarity')) {
            detectedColumns.rarity = column
            confidence += 0.1
          } else if (lowerColumn.includes('type')) {
            detectedColumns.card_type = column
            confidence += 0.1
          } else if (lowerColumn.includes('flavor') || lowerColumn.includes('fluff')) {
            detectedColumns.flavor_text = column
            confidence += 0.05
          }
        }

        return {
          delimiter: ',', // Papa Parse handles detection
          hasHeader: true,
          encoding: 'utf-8',
          detectedColumns,
          confidence: Math.min(confidence, 1)
        }
      },

      setColumnMapping: (mapping: ColumnMapping) => {
        set({ columnMapping: mapping })
      },

      setFlexibleMapping: (mapping: FlexibleColumnMapping) => {
        const { dynamicAnalysis } = get()
        
        set({ flexibleMapping: mapping })
        
        // Regenerate template when mapping changes
        if (dynamicAnalysis) {
          const templateGenerator = new TemplateGenerator()
          const generatedTemplate = templateGenerator.generateFromCSV(dynamicAnalysis, mapping)
          set({ generatedTemplate })
        }
      },

      generateTemplate: (userPrefs?: Partial<DynamicPromptTemplate>) => {
        const { dynamicAnalysis, flexibleMapping } = get()
        
        if (dynamicAnalysis) {
          const templateGenerator = new TemplateGenerator()
          const generatedTemplate = templateGenerator.generateFromCSV(dynamicAnalysis, flexibleMapping || undefined, userPrefs)
          set({ generatedTemplate })
        }
      },

      toggleDynamicSystem: (enabled: boolean) => {
        set({ useDynamicSystem: enabled })
        
        // If switching to legacy and we have data, re-process it
        const { rawData } = get()
        if (!enabled && rawData) {
          const format = get().detectFormat(rawData)
          set({ detectedFormat: format })
        }
      },

      validateData: () => {
        const { rawData, useDynamicSystem } = get()
        
        if (!rawData) {
          return {
            isValid: false,
            errors: ['No CSV data loaded'],
            warnings: [],
            validCards: []
          }
        }

        if (useDynamicSystem) {
          // New validation for dynamic system
          return get().validateDynamicData()
        } else {
          // Legacy validation
          return get().validateLegacyData()
        }
      },

      validateDynamicData: () => {
        const { rawData, flexibleMapping, dynamicAnalysis } = get()
        
        if (!rawData || !dynamicAnalysis) {
          return {
            isValid: false,
            errors: ['No CSV data or analysis available'],
            warnings: [],
            validCards: []
          }
        }

        const errors: string[] = []
        const warnings: string[] = []
        const validCards: CardData[] = []

        // Check if we have at least a name or identifier
        const hasIdentifier = flexibleMapping?.coreFields.name || dynamicAnalysis.suggestedMappings.name
        if (!hasIdentifier) {
          warnings.push('No name/identifier column mapped - using row numbers as identifiers')
        }

        // Process each row
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i]
          const cardData: Partial<CardData> = {}

          // Apply core field mappings
          if (flexibleMapping?.coreFields.name) {
            cardData.name = row[flexibleMapping.coreFields.name.sourceColumn] || `Item ${i + 1}`
          } else if (dynamicAnalysis.suggestedMappings.name) {
            cardData.name = row[dynamicAnalysis.suggestedMappings.name] || `Item ${i + 1}`
          } else {
            cardData.name = `Item ${i + 1}`
          }

          if (flexibleMapping?.coreFields.description) {
            cardData.description = row[flexibleMapping.coreFields.description.sourceColumn] || 'No description'
          } else if (dynamicAnalysis.suggestedMappings.description) {
            cardData.description = row[dynamicAnalysis.suggestedMappings.description] || 'No description'
          } else {
            cardData.description = 'No description'
          }

          // Generate UUID
          cardData.uuid = `card_${Date.now()}_${i}`
          
          // Set defaults for legacy compatibility
          cardData.rarity = row.rarity || 'Common'
          cardData.card_type = row.card_type || row.type || 'Item'

          // Add all other columns as additional fields
          for (const [key, value] of Object.entries(row)) {
            if (!['name', 'description', 'uuid', 'rarity', 'card_type'].includes(key)) {
              (cardData as any)[key] = value
            }
          }

          validCards.push(cardData as CardData)
        }

        return {
          isValid: validCards.length > 0,
          errors,
          warnings,
          validCards
        }
      },

      validateLegacyData: () => {
        const { rawData, columnMapping } = get()
        
        if (!rawData) {
          return {
            isValid: false,
            errors: ['No CSV data loaded'],
            warnings: [],
            validCards: []
          }
        }

        const errors: string[] = []
        const warnings: string[] = []
        const validCards: CardData[] = []

        // Check if all required fields are mapped
        for (const field of requiredFields) {
          if (!columnMapping[field]?.sourceColumn) {
            errors.push(`Required field '${field}' is not mapped`)
          }
        }

        if (errors.length > 0) {
          return { isValid: false, errors, warnings, validCards }
        }

        // Process each row
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i]
          const cardData: Partial<CardData> = {}
          const rowErrors: string[] = []

          // Apply mappings
          for (const [field, mapping] of Object.entries(columnMapping)) {
            const typedMapping = mapping as any
            if (typedMapping.sourceColumn && row[typedMapping.sourceColumn] !== undefined) {
              let value = row[typedMapping.sourceColumn]
              
              // Apply transform if provided
              if (typedMapping.transform) {
                try {
                  value = typedMapping.transform(value)
                } catch (error) {
                  rowErrors.push(`Row ${i + 1}: Transform failed for field '${field}'`)
                  continue
                }
              }
              
              cardData[field as keyof CardData] = value
            } else if (typedMapping.defaultValue) {
              cardData[field as keyof CardData] = typedMapping.defaultValue
            } else if (typedMapping.required) {
              rowErrors.push(`Row ${i + 1}: Required field '${field}' is missing`)
            }
          }

          // Generate UUID if not provided
          if (!cardData.uuid) {
            cardData.uuid = `card_${Date.now()}_${i}`
            warnings.push(`Row ${i + 1}: Generated UUID for card '${cardData.name}'`)
          }

          // Add all additional fields from the row
          for (const [key, value] of Object.entries(row)) {
            if (!(key in cardData)) {
              (cardData as any)[key] = value
            }
          }

          if (rowErrors.length === 0) {
            validCards.push(cardData as CardData)
          } else {
            errors.push(...rowErrors)
          }
        }

        return {
          isValid: validCards.length > 0 && errors.length === 0,
          errors,
          warnings,
          validCards
        }
      },

      // New helper method for validating with specific mapping
      validateDynamicDataWithMapping: (rawData: any[], dynamicAnalysis: DynamicCSVAnalysis, flexibleMapping: FlexibleColumnMapping) => {
        if (!rawData || !dynamicAnalysis) {
          return {
            isValid: false,
            errors: ['No CSV data or analysis available'],
            warnings: [],
            validCards: []
          }
        }

        const errors: string[] = []
        const warnings: string[] = []
        const validCards: CardData[] = []

        // Check if we have at least a name or identifier
        const hasIdentifier = flexibleMapping?.coreFields.name || dynamicAnalysis.suggestedMappings.name
        if (!hasIdentifier) {
          warnings.push('No name/identifier column mapped - using row numbers as identifiers')
        }

        // Process each row
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i]
          const cardData: Partial<CardData> = {}

          // Apply core field mappings
          if (flexibleMapping?.coreFields.name) {
            cardData.name = row[flexibleMapping.coreFields.name.sourceColumn] || `Item ${i + 1}`
          } else if (dynamicAnalysis.suggestedMappings.name) {
            cardData.name = row[dynamicAnalysis.suggestedMappings.name] || `Item ${i + 1}`
          } else {
            cardData.name = `Item ${i + 1}`
          }

          if (flexibleMapping?.coreFields.description) {
            cardData.description = row[flexibleMapping.coreFields.description.sourceColumn] || 'No description'
          } else if (dynamicAnalysis.suggestedMappings.description) {
            cardData.description = row[dynamicAnalysis.suggestedMappings.description] || 'No description'
          } else {
            cardData.description = 'No description'
          }

          // Generate UUID
          cardData.uuid = `card_${Date.now()}_${i}`
          
          // Set defaults for legacy compatibility
          cardData.rarity = row.rarity || 'Common'
          cardData.card_type = row.card_type || row.type || 'Item'

          // Add all other columns as additional fields
          for (const [key, value] of Object.entries(row)) {
            if (!['name', 'description', 'uuid', 'rarity', 'card_type'].includes(key)) {
              (cardData as any)[key] = value
            }
          }

          validCards.push(cardData as CardData)
        }

        return {
          isValid: validCards.length > 0,
          errors,
          warnings,
          validCards
        }
      },

      reset: () => {
        set({
          rawData: null,
          detectedFormat: null,
          columnMapping: {},
          validatedCards: [],
          fileName: null,
          isProcessing: false,
          dynamicAnalysis: null,
          flexibleMapping: null,
          generatedTemplate: null
        })
      }
    }),
    {
      name: 'csv-store',
      partialize: (state) => ({
        useDynamicSystem: state.useDynamicSystem,
        flexibleMapping: state.flexibleMapping,
        generatedTemplate: state.generatedTemplate
      }),
    }
  )
) 