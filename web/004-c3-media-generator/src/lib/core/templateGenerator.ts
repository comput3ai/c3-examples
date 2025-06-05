import type { DynamicCSVAnalysis, DynamicPromptTemplate, TemplateVariable, FlexibleColumnMapping } from '../../types/index'

export class TemplateGenerator {
  /**
   * Generates a dynamic prompt template based on CSV analysis and user preferences
   */
  generateFromCSV(
    csvAnalysis: DynamicCSVAnalysis,
    mapping?: FlexibleColumnMapping,
    userPrefs?: Partial<DynamicPromptTemplate>
  ): DynamicPromptTemplate {
    const variables = this.createVariablesFromColumns(csvAnalysis.columns, mapping)
    const baseTemplate = this.generateBaseTemplate(csvAnalysis, mapping, userPrefs)
    const conditionals = this.generateConditionals(csvAnalysis.columns)
    
    return {
      id: `template_${Date.now()}`,
      name: userPrefs?.name || 'Auto-Generated Template',
      version: 1,
      baseTemplate,
      variables,
      autoGeneration: {
        includeAllColumns: mapping?.customVariables.length ? false : true,
        nameInPrompt: !!csvAnalysis.suggestedMappings.name,
        descriptionInPrompt: !!csvAnalysis.suggestedMappings.description,
        columnPrefixes: this.generateColumnPrefixes(csvAnalysis.columns)
      },
      conditionals
    }
  }

  /**
   * Creates template variables from CSV columns
   */
  private createVariablesFromColumns(
    columns: DynamicCSVAnalysis['columns'],
    mapping?: FlexibleColumnMapping
  ): Record<string, TemplateVariable> {
    const variables: Record<string, TemplateVariable> = {}
    
    // Add core field variables if mapped
    if (mapping?.coreFields.prompt) {
      variables.prompt = {
        sourceColumn: mapping.coreFields.prompt.sourceColumn,
        includeInAuto: mapping.coreFields.prompt.useAsBase,
        transform: 'none'
      }
    }
    
    if (mapping?.coreFields.name) {
      variables.name = {
        sourceColumn: mapping.coreFields.name.sourceColumn,
        includeInAuto: mapping.coreFields.name.includeInPrompt,
        transform: 'none'
      }
    }
    
    if (mapping?.coreFields.description) {
      variables.description = {
        sourceColumn: mapping.coreFields.description.sourceColumn,
        includeInAuto: mapping.coreFields.description.includeInPrompt,
        transform: 'none'
      }
    }
    
    // Add custom variables
    if (mapping?.customVariables) {
      for (const customVar of mapping.customVariables) {
        variables[customVar.variableName] = {
          sourceColumn: customVar.sourceColumn,
          includeInAuto: customVar.includeInPrompt,
          prefix: customVar.prefix,
          suffix: customVar.suffix,
          transform: 'none'
        }
      }
    }
    
    // Add auto-variables for all columns (user can disable in UI)
    for (const column of columns) {
      const varName = this.sanitizeVariableName(column.name)
      if (!variables[varName]) {
        variables[varName] = {
          sourceColumn: column.name,
          includeInAuto: false, // Don't auto-include unless explicitly mapped
          transform: 'none'
        }
      }
    }
    
    return variables
  }

  /**
   * Generates the base template based on analysis and mapping
   */
  private generateBaseTemplate(
    analysis: DynamicCSVAnalysis,
    mapping?: FlexibleColumnMapping,
    userPrefs?: Partial<DynamicPromptTemplate>
  ): { positive: string; negative: string } {
    let positive = ''
    
    // Use user-provided base if available
    if (userPrefs?.baseTemplate) {
      return userPrefs.baseTemplate
    }
    
    // Build prompt based on available mappings
    const promptParts: string[] = []
    
    // Use explicit prompt column if available and set as base
    if (mapping?.coreFields.prompt?.useAsBase) {
      promptParts.push(`{${this.sanitizeVariableName(mapping.coreFields.prompt.sourceColumn)}}`)
    } else {
      // Build from name and description
      if (mapping?.coreFields.name?.includeInPrompt || analysis.suggestedMappings.name) {
        const nameCol = mapping?.coreFields.name?.sourceColumn || analysis.suggestedMappings.name
        if (nameCol) {
          promptParts.push(`{${this.sanitizeVariableName(nameCol)}}`)
        }
      }
      
      if (mapping?.coreFields.description?.includeInPrompt || analysis.suggestedMappings.description) {
        const descCol = mapping?.coreFields.description?.sourceColumn || analysis.suggestedMappings.description
        if (descCol) {
          promptParts.push(`{${this.sanitizeVariableName(descCol)}}`)
        }
      }
    }
    
    // Add custom variables that should be included
    if (mapping?.customVariables) {
      for (const customVar of mapping.customVariables) {
        if (customVar.includeInPrompt) {
          let varText = `{${customVar.variableName}}`
          if (customVar.prefix) varText = `${customVar.prefix} ${varText}`
          if (customVar.suffix) varText = `${varText} ${customVar.suffix}`
          promptParts.push(varText)
        }
      }
    }
    
    // If no parts, create a basic template
    if (promptParts.length === 0) {
      promptParts.push('detailed digital artwork')
    }
    
    // Join parts and add style enhancement
    positive = promptParts.join(', ')
    positive += ', detailed digital art, fantasy style, high quality, masterpiece'
    
    const negative = 'blurry, low quality, distorted, deformed, text, watermark, signature, username'
    
    return { positive, negative }
  }

  /**
   * Generates conditional enhancements based on column analysis
   */
  private generateConditionals(columns: DynamicCSVAnalysis['columns']): DynamicPromptTemplate['conditionals'] {
    const conditionals: DynamicPromptTemplate['conditionals'] = []
    
    // Look for rarity-like columns
    const rarityColumns = columns.filter(col => 
      col.name.toLowerCase().includes('rarity') ||
      col.name.toLowerCase().includes('tier') ||
      col.name.toLowerCase().includes('quality') ||
      col.type === 'enum'
    )
    
    for (const rarityCol of rarityColumns.slice(0, 2)) { // Max 2 conditional columns
      const varName = this.sanitizeVariableName(rarityCol.name)
      
      // Create enhancements based on sample values
      for (const value of rarityCol.sampleValues.slice(0, 4)) { // Max 4 conditions per column
        const enhancement = this.getEnhancementForValue(value.toString())
        if (enhancement) {
          conditionals.push({
            condition: `${varName} === '${value}'`,
            enhancement,
            target: 'positive'
          })
        }
      }
    }
    
    return conditionals
  }

  /**
   * Generates appropriate column prefixes for natural language
   */
  private generateColumnPrefixes(columns: DynamicCSVAnalysis['columns']): Record<string, string> {
    const prefixes: Record<string, string> = {}
    
    for (const column of columns) {
      const lowerName = column.name.toLowerCase()
      
      // Generate contextual prefixes
      if (lowerName.includes('color') || lowerName.includes('colour')) {
        prefixes[column.name] = 'with'
      } else if (lowerName.includes('style') || lowerName.includes('type')) {
        prefixes[column.name] = 'in'
      } else if (lowerName.includes('mood') || lowerName.includes('atmosphere')) {
        prefixes[column.name] = 'with a'
      } else if (lowerName.includes('size') || lowerName.includes('scale')) {
        prefixes[column.name] = 'at'
      } else if (column.type === 'enum' && column.uniqueCount <= 5) {
        // Small enums often describe attributes
        prefixes[column.name] = 'with'
      }
    }
    
    return prefixes
  }

  /**
   * Creates enhancement text based on value patterns
   */
  private getEnhancementForValue(value: string): string | null {
    const lowerValue = value.toLowerCase()
    
    // Rarity enhancements
    if (lowerValue.includes('common')) {
      return 'clean design, standard quality'
    } else if (lowerValue.includes('uncommon')) {
      return 'enhanced details, improved craftsmanship'
    } else if (lowerValue.includes('rare')) {
      return 'masterwork quality, glowing effects, magical aura'
    } else if (lowerValue.includes('legendary') || lowerValue.includes('epic')) {
      return 'divine radiance, epic proportions, otherworldly power, golden light'
    }
    
    // Quality enhancements
    if (lowerValue.includes('low')) {
      return 'simple design, basic quality'
    } else if (lowerValue.includes('high') || lowerValue.includes('premium')) {
      return 'premium quality, exceptional detail, luxurious finish'
    }
    
    // Style enhancements
    if (lowerValue.includes('dark')) {
      return 'dark atmosphere, moody lighting, shadows'
    } else if (lowerValue.includes('bright') || lowerValue.includes('light')) {
      return 'bright lighting, cheerful atmosphere, vibrant colors'
    }
    
    return null
  }

  /**
   * Sanitizes column names to valid variable names
   */
  private sanitizeVariableName(columnName: string): string {
    return columnName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  /**
   * Compiles a template with actual data for preview
   */
  compileTemplate(template: DynamicPromptTemplate, cardData: Record<string, any>): { positive: string; negative: string } {
    let positive = template.baseTemplate.positive
    let negative = template.baseTemplate.negative
    
    // Replace variables
    for (const [varName, variable] of Object.entries(template.variables)) {
      const value = this.getVariableValue(variable, cardData)
      const placeholder = `{${varName}}`
      
      positive = positive.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
      negative = negative.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    }
    
    // Apply conditionals
    for (const conditional of template.conditionals) {
      if (this.evaluateCondition(conditional.condition, cardData, template.variables)) {
        if (conditional.target === 'positive') {
          positive += `, ${conditional.enhancement}`
        } else {
          negative += `, ${conditional.enhancement}`
        }
      }
    }
    
    return { positive, negative }
  }

  /**
   * Gets the value for a template variable from card data
   */
  private getVariableValue(variable: TemplateVariable, cardData: Record<string, any>): string {
    let value = ''
    
    if (variable.sourceColumn && cardData[variable.sourceColumn] !== undefined) {
      value = String(cardData[variable.sourceColumn])
    } else if (variable.defaultValue) {
      value = variable.defaultValue
    }
    
    // Apply transform
    switch (variable.transform) {
      case 'uppercase':
        value = value.toUpperCase()
        break
      case 'lowercase':
        value = value.toLowerCase()
        break
      case 'capitalize':
        value = value.replace(/\b\w/g, l => l.toUpperCase())
        break
    }
    
    // Add prefix/suffix
    if (variable.prefix && value) value = `${variable.prefix} ${value}`
    if (variable.suffix && value) value = `${value} ${variable.suffix}`
    
    return value
  }

  /**
   * Evaluates a condition against card data
   */
  private evaluateCondition(condition: string, cardData: Record<string, any>, variables: Record<string, TemplateVariable>): boolean {
    try {
      // Simple condition evaluation (variable === 'value')
      const match = condition.match(/(\w+)\s*===\s*'([^']*)'/)
      if (match) {
        const [, varName, expectedValue] = match
        const variable = variables[varName]
        if (variable?.sourceColumn) {
          const actualValue = String(cardData[variable.sourceColumn] || '')
          return actualValue === expectedValue
        }
      }
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error)
    }
    
    return false
  }
} 