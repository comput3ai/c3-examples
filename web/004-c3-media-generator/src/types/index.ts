// Core data types
export interface CardData {
  uuid: string
  name: string
  description: string
  flavor_text?: string
  rarity: string
  card_type: string
  [key: string]: any // Allow additional fields
}

// Enhanced CSV processing types for Configuration Phase
export interface DynamicCSVAnalysis {
  columns: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'enum';
    sampleValues: string[];
    uniqueCount: number;
    nullCount: number;
  }>;
  
  // Smart field suggestions
  suggestedMappings: {
    prompt?: string;      // User-provided prompt column
    name?: string;        // Card/item name
    description?: string; // Description text
  };
  
  confidence: {
    prompt: number;       // 0-1 confidence for prompt detection
    name: number;         // 0-1 confidence for name detection  
    description: number;  // 0-1 confidence for description detection
    overall: number;      // Overall detection confidence
  };
}

export interface FlexibleColumnMapping {
  // Core mappings (suggested, not required)
  coreFields: {
    prompt?: {
      sourceColumn: string;
      useAsBase: boolean;        // Use as base prompt vs enhancement
    };
    name?: {
      sourceColumn: string;
      includeInPrompt: boolean;  // Auto-include in generated prompt
    };
    description?: {
      sourceColumn: string;
      includeInPrompt: boolean;
    };
  };
  
  // Custom variable mappings
  customVariables: Array<{
    variableName: string;      // e.g., "character_class", "mood"
    sourceColumn: string;      // CSV column name
    includeInPrompt: boolean;  // Auto-include in template
    prefix?: string;           // Optional prefix for prompt
    suffix?: string;           // Optional suffix for prompt
  }>;
  
  // Generated template variables (auto-created from all columns)
  autoVariables: Record<string, string>; // {column_name: csv_column}
}

export interface DynamicPromptTemplate {
  id: string;
  name: string;
  version: number;
  
  // Template configuration
  baseTemplate: {
    positive: string;    // Base positive prompt with {variables}
    negative: string;    // Base negative prompt
  };
  
  // Variable definitions (auto-generated + custom)
  variables: Record<string, TemplateVariable>;
  
  // Auto-generation rules
  autoGeneration: {
    includeAllColumns: boolean;     // Auto-include all CSV columns as variables
    nameInPrompt: boolean;          // Auto-include name in prompt
    descriptionInPrompt: boolean;   // Auto-include description in prompt
    columnPrefixes: Record<string, string>; // Per-column prefixes
  };
  
  // Conditional enhancements (replaces hardcoded rarity system)
  conditionals: Array<{
    condition: string;              // e.g., "rarity === 'Legendary'"
    enhancement: string;            // Additional prompt text
    target: 'positive' | 'negative';
  }>;
}

export interface TemplateVariable {
  sourceColumn?: string;            // CSV column source
  defaultValue?: string;            // Default if column missing
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  includeInAuto: boolean;          // Include in auto-generated prompt
  prefix?: string;                 // Text before variable
  suffix?: string;                 // Text after variable
}

// Legacy CSV processing types (keeping for backward compatibility)
export interface CSVFormat {
  delimiter: ',' | ';' | '\t'
  hasHeader: boolean
  encoding: 'utf-8' | 'latin-1'
  detectedColumns: {
    name?: string
    description?: string
    uuid?: string
    rarity?: string
    card_type?: string
    flavor_text?: string
  }
  confidence: number // 0-1 score
}

export interface ColumnMapping {
  [requiredField: string]: {
    sourceColumn: string | null
    transform?: (value: string) => string
    required: boolean
    defaultValue?: string
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validCards: CardData[]
}

// Workload management types
export interface Workload {
  id: string
  workload: string
  node: string
  type: string
  status: 'launching' | 'healthy' | 'unhealthy' | 'stopping'
  url?: string
  expires?: number
}

export interface WorkloadSummary {
  total_workloads: number
  media_workloads: number
  media_details: Array<{
    node: string
    type: string
    id: string
  }>
}

// Generation job types
export interface GenerationJob {
  id: string
  card: CardData
  workloadId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
  startedAt?: number
  completedAt?: number
  error?: string
  promptId?: string
  statusMessage?: string
  imageUrl?: string
}

export interface GenerationParams {
  width: number
  height: number
  steps: number
  seed?: number
  guidance: number
  model: string
  quality?: 'fast' | 'balanced' | 'high'
  batchSize?: number
}

export interface GenerationResult {
  jobId: string
  cardName: string
  imageUrl: string  // For backward compatibility - will be mediaUrl in practice
  imageBlob: Blob   // For backward compatibility - will be mediaBlob in practice
  mediaUrl?: string  // Generic URL for both images and videos
  mediaBlob?: Blob   // Generic blob for both images and videos
  type: 'image' | 'video'  // Indicates the media type
  prompt: string
  seed: number
  nodeId: string
  filename: string
}

export interface GenerationError {
  jobId: string
  cardName: string
  error: string
  retryCount: number
}

// API types
export interface ComfyUIPrompt {
  prompt: {
    [nodeId: string]: {
      inputs: any
      class_type: string
    }
  }
  client_id: string
}

export interface JobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  error?: string
  result?: {
    images: Array<{
      filename: string
      type: string
    }>
    videos?: Array<{
      filename: string
      type: string
    }>
  }
}

// App state types
export type AppStep = 'setup' | 'upload' | 'mapping' | 'workloads' | 'generation' | 'results'

export interface PromptTemplate {
  positive: string
  negative: string
  variables: string[]
} 