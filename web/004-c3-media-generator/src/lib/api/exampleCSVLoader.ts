import Papa from 'papaparse'
import type { DynamicCSVAnalysis } from '../../types'
import { SmartCSVDetector } from '../core/smartCSVDetector'

/**
 * CSV Example Loader
 * 
 * 🎯 FULLY DYNAMIC CSV DISCOVERY!
 * 
 * Just add any CSV file to public/examplecsvs/ and it will be automatically discovered.
 * No code changes needed, no manifest files required.
 * 
 * Powered by Vite's import.meta.glob for build-time discovery.
 */

export interface CSVExample {
  name: string
  fileName: string
  description: string
  analysis: DynamicCSVAnalysis
  sampleRows: any[]
  totalRows: number
}

export class ExampleCSVLoader {
  private static instance: ExampleCSVLoader | null = null
  private examples: CSVExample[] = []
  private isLoaded = false

  static getInstance(): ExampleCSVLoader {
    if (!ExampleCSVLoader.instance) {
      ExampleCSVLoader.instance = new ExampleCSVLoader()
    }
    return ExampleCSVLoader.instance
  }

  async loadExamples(): Promise<CSVExample[]> {
    if (this.isLoaded) {
      return this.examples
    }

    try {
      const exampleFiles = await this.discoverExampleFiles()
      
      // Clear examples to prevent duplicates
      this.examples = []
      
      for (const fileName of exampleFiles) {
        try {
          const example = await this.loadAndAnalyzeExample(fileName)
          // Check if example with this fileName already exists to prevent duplicates
          if (!this.examples.find(e => e.fileName === example.fileName)) {
            this.examples.push(example)
          }
        } catch (error) {
          console.warn(`Failed to load example ${fileName}:`, error)
        }
      }

      this.isLoaded = true
      return this.examples
    } catch (error) {
      console.error('Failed to load examples:', error)
      return []
    }
  }

  private async discoverExampleFiles(): Promise<string[]> {
    // Use Vite's import.meta.glob to discover all CSV files at build time
    // This automatically finds all .csv files in the public/examplecsvs directory
    const csvModules = import.meta.glob('/public/examplecsvs/*.csv', { 
      as: 'url',
      eager: false 
    })
    
    // Extract just the filenames from the full paths
    const discoveredFiles = Object.keys(csvModules).map(path => {
      // Convert '/public/examplecsvs/filename.csv' to 'filename.csv'
      return path.split('/').pop() || ''
    }).filter(filename => filename.endsWith('.csv'))

    console.log('📁 Auto-discovered CSV files:', discoveredFiles)

    // Verify that the files actually exist by making HEAD requests
    const availableFiles: string[] = []
    
    for (const fileName of discoveredFiles) {
      try {
        const response = await fetch(`/examplecsvs/${fileName}`, { method: 'HEAD' })
        if (response.ok) {
          availableFiles.push(fileName)
        }
      } catch (error) {
        console.warn(`File discovered but not accessible: ${fileName}`)
      }
    }
    
    console.log('✅ Verified available CSV files:', availableFiles)
    return availableFiles
  }

  private async loadAndAnalyzeExample(fileName: string): Promise<CSVExample> {
    const response = await fetch(`/examplecsvs/${fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`)
    }

    const csvText = await response.text()
    
    return new Promise<CSVExample>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value: any) => value.trim(),
        complete: (results: any) => {
          if (results.errors.length > 0) {
            console.warn(`CSV parsing warnings for ${fileName}:`, results.errors)
          }

          const detector = new SmartCSVDetector()
          const analysis = detector.analyzeCSV(results.data)

          // Generate a user-friendly name and description based on the analysis
          const name = this.generateExampleName(fileName, analysis)
          const description = this.generateExampleDescription(fileName, analysis)

          const example: CSVExample = {
            name,
            fileName,
            description,
            analysis,
            sampleRows: results.data.slice(0, 3), // First 3 rows as preview
            totalRows: results.data.length
          }

          resolve(example)
        },
        error: (error: any) => {
          reject(error)
        }
      })
    })
  }

  private generateExampleName(fileName: string, analysis: DynamicCSVAnalysis): string {
    // Just clean up the filename - no fancy logic
    return fileName
      .replace('.csv', '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private generateExampleDescription(fileName: string, analysis: DynamicCSVAnalysis): string {
    const columnCount = analysis.columns.length
    
    return `Dataset with ${columnCount} columns and ${analysis.columns[0]?.uniqueCount || 0} rows`
  }

  // Method to use an example as if it was uploaded
  async useExample(example: CSVExample): Promise<{ data: any[], analysis: DynamicCSVAnalysis }> {
    const response = await fetch(`/examplecsvs/${example.fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${example.fileName}: ${response.statusText}`)
    }

    const csvText = await response.text()
    
    return new Promise<{ data: any[], analysis: DynamicCSVAnalysis }>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value: any) => value.trim(),
        complete: (results: any) => {
          resolve({
            data: results.data,
            analysis: example.analysis
          })
        },
        error: (error: any) => {
          reject(error)
        }
      })
    })
  }

  // Method to refresh examples (useful for development)
  refreshExamples(): void {
    this.isLoaded = false
    this.examples = []
  }

  // Method to check if a specific file exists
  async checkFileExists(fileName: string): Promise<boolean> {
    try {
      const response = await fetch(`/examplecsvs/${fileName}`, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      return false
    }
  }
} 