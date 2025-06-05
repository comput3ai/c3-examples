import type { DynamicCSVAnalysis } from '../../types/index'

interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'enum';
  sampleValues: string[];
  uniqueCount: number;
  nullCount: number;
}

export class SmartCSVDetector {
  /**
   * Analyzes CSV data and provides intelligent field suggestions
   */
  analyzeCSV(data: any[]): DynamicCSVAnalysis {
    if (!data || data.length === 0) {
      return this.getEmptyAnalysis()
    }

    const columns = this.analyzeColumns(data)
    const suggestedMappings = this.suggestMappings(columns)
    const confidence = this.calculateConfidence(suggestedMappings, columns)
    
    return { columns, suggestedMappings, confidence }
  }

  private analyzeColumns(data: any[]): ColumnInfo[] {
    const firstRow = data[0]
    const columnNames = Object.keys(firstRow)
    
    return columnNames.map(columnName => {
      const values = data.map(row => row[columnName]).filter(val => val != null && val !== '')
      const uniqueValues = [...new Set(values)]
      
      return {
        name: columnName,
        type: this.detectColumnType(values),
        sampleValues: values.slice(0, 5), // First 5 non-null values
        uniqueCount: uniqueValues.length,
        nullCount: data.length - values.length
      }
    })
  }

  private detectColumnType(values: any[]): 'text' | 'number' | 'boolean' | 'enum' {
    if (values.length === 0) return 'text'
    
    // Check for numbers
    const numberValues = values.filter(val => !isNaN(parseFloat(val)) && isFinite(val))
    if (numberValues.length / values.length > 0.8) {
      return 'number'
    }
    
    // Check for booleans
    const booleanValues = values.filter(val => 
      ['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase())
    )
    if (booleanValues.length / values.length > 0.8) {
      return 'boolean'
    }
    
    // Check for enum (limited unique values)
    const uniqueValues = [...new Set(values)]
    if (uniqueValues.length <= Math.min(10, values.length * 0.3)) {
      return 'enum'
    }
    
    return 'text'
  }

  private suggestMappings(columns: ColumnInfo[]): DynamicCSVAnalysis['suggestedMappings'] {
    return {
      prompt: this.findBestMatch(columns, [
        'prompt', 'text', 'description', 'content', 'details', 'summary',
        'prompt_text', 'image_prompt', 'full_description'
      ]),
      name: this.findBestMatch(columns, [
        'name', 'title', 'card_name', 'item', 'item_name', 'character',
        'character_name', 'object', 'subject'
      ]),
      description: this.findBestMatch(columns, [
        'description', 'desc', 'details', 'summary', 'info', 'about',
        'short_description', 'brief', 'overview'
      ])
    }
  }

  private findBestMatch(columns: ColumnInfo[], keywords: string[]): string | undefined {
    let bestMatch: { column: string; score: number } | null = null
    
    for (const column of columns) {
      const score = this.calculateMatchScore(column.name, keywords)
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { column: column.name, score }
      }
    }
    
    // Only return matches with reasonable confidence
    return bestMatch && bestMatch.score >= 0.6 ? bestMatch.column : undefined
  }

  private calculateMatchScore(columnName: string, keywords: string[]): number {
    const lowerColumn = columnName.toLowerCase()
    let maxScore = 0
    
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase()
      let score = 0
      
      // Exact match gets highest score
      if (lowerColumn === lowerKeyword) {
        score = 1.0
      }
      // Starts with keyword
      else if (lowerColumn.startsWith(lowerKeyword)) {
        score = 0.9
      }
      // Ends with keyword
      else if (lowerColumn.endsWith(lowerKeyword)) {
        score = 0.8
      }
      // Contains keyword
      else if (lowerColumn.includes(lowerKeyword)) {
        score = 0.7
      }
      // Fuzzy match (keyword contains column or vice versa)
      else if (lowerKeyword.includes(lowerColumn) || this.fuzzyMatch(lowerColumn, lowerKeyword)) {
        score = 0.6
      }
      
      maxScore = Math.max(maxScore, score)
    }
    
    return maxScore
  }

  private fuzzyMatch(str1: string, str2: string): boolean {
    // Simple fuzzy matching - check if most characters match
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return true
    
    let matches = 0
    for (const char of shorter) {
      if (longer.includes(char)) matches++
    }
    
    return (matches / shorter.length) >= 0.7
  }

  private calculateConfidence(
    suggestedMappings: DynamicCSVAnalysis['suggestedMappings'], 
    columns: ColumnInfo[]
  ): DynamicCSVAnalysis['confidence'] {
    const promptConfidence = suggestedMappings.prompt ? this.getFieldConfidence(suggestedMappings.prompt, columns, 'prompt') : 0
    const nameConfidence = suggestedMappings.name ? this.getFieldConfidence(suggestedMappings.name, columns, 'name') : 0
    const descriptionConfidence = suggestedMappings.description ? this.getFieldConfidence(suggestedMappings.description, columns, 'description') : 0
    
    // Overall confidence is weighted average
    const weights = { prompt: 0.4, name: 0.3, description: 0.3 }
    const overall = (
      promptConfidence * weights.prompt + 
      nameConfidence * weights.name + 
      descriptionConfidence * weights.description
    )
    
    return {
      prompt: promptConfidence,
      name: nameConfidence,
      description: descriptionConfidence,
      overall
    }
  }

  private getFieldConfidence(columnName: string, columns: ColumnInfo[], fieldType: string): number {
    const column = columns.find(c => c.name === columnName)
    if (!column) return 0
    
    let confidence = 0.5 // Base confidence for being selected
    
    // Boost confidence based on column characteristics
    switch (fieldType) {
      case 'prompt':
        // Prompts should be text with good length variety
        if (column.type === 'text') confidence += 0.2
        if (column.sampleValues.some(val => val.length > 50)) confidence += 0.2
        break
        
      case 'name':
        // Names should be text with reasonable uniqueness
        if (column.type === 'text') confidence += 0.2
        if (column.uniqueCount / (column.sampleValues.length + column.nullCount) > 0.7) confidence += 0.2
        break
        
      case 'description':
        // Descriptions should be text, potentially longer
        if (column.type === 'text') confidence += 0.2
        if (column.sampleValues.some(val => val.length > 20)) confidence += 0.2
        break
    }
    
    // Penalize high null count
    const nullRatio = column.nullCount / (column.sampleValues.length + column.nullCount)
    confidence -= nullRatio * 0.3
    
    return Math.max(0, Math.min(1, confidence))
  }

  private getEmptyAnalysis(): DynamicCSVAnalysis {
    return {
      columns: [],
      suggestedMappings: {},
      confidence: {
        prompt: 0,
        name: 0,
        description: 0,
        overall: 0
      }
    }
  }

  /**
   * Generates user-friendly field suggestions with explanations
   */
  getFieldSuggestions(analysis: DynamicCSVAnalysis): Array<{
    field: string;
    suggestion: string | null;
    confidence: number;
    explanation: string;
    alternatives: string[];
  }> {
    return [
      {
        field: 'prompt',
        suggestion: analysis.suggestedMappings.prompt || null,
        confidence: analysis.confidence.prompt,
        explanation: analysis.suggestedMappings.prompt 
          ? `"${analysis.suggestedMappings.prompt}" appears to contain detailed text suitable for image prompts`
          : 'No column clearly identified as containing image prompts. You can manually select one or use name + description.',
        alternatives: this.getAlternatives(analysis.columns, 'prompt', analysis.suggestedMappings.prompt)
      },
      {
        field: 'name',
        suggestion: analysis.suggestedMappings.name || null,
        confidence: analysis.confidence.name,
        explanation: analysis.suggestedMappings.name
          ? `"${analysis.suggestedMappings.name}" appears to contain unique identifiers or names`
          : 'No clear name/title column found. This helps identify each generated image.',
        alternatives: this.getAlternatives(analysis.columns, 'name', analysis.suggestedMappings.name)
      },
      {
        field: 'description',
        suggestion: analysis.suggestedMappings.description || null,
        confidence: analysis.confidence.description,
        explanation: analysis.suggestedMappings.description
          ? `"${analysis.suggestedMappings.description}" appears to contain descriptive text`
          : 'No clear description column found. This can enhance image prompts with additional details.',
        alternatives: this.getAlternatives(analysis.columns, 'description', analysis.suggestedMappings.description)
      }
    ]
  }

  private getAlternatives(columns: ColumnInfo[], _fieldType: string, currentSuggestion: string | undefined): string[] {
    const alternatives = columns
      .filter(col => col.name !== currentSuggestion && col.type === 'text')
      .map(col => col.name)
      .slice(0, 3)
    
    return alternatives
  }
} 