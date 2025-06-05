import type { Workload, WorkloadSummary } from '../../types'

export class Comput3Client {
  private apiKey: string
  private baseUrl: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
    
    // Check for environment variable overrides
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const customCorsProxy = import.meta.env.VITE_CORS_PROXY
    const customApiBase = import.meta.env.VITE_API_BASE_URL
    
    // Use environment variables or auto-detect
    const isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    
    if (customApiBase) {
      // Use custom API base URL (for advanced development scenarios)
      this.baseUrl = customApiBase
    } else if (isProduction) {
      // Production: Use Netlify proxy
      this.baseUrl = '/api/comput3'
    } else {
      // Development: Use direct API (through CORS proxy if needed)
      this.baseUrl = 'https://api.comput3.ai/api/v0'
    }
    
    const environment = isProduction ? 'production' : 'development'
    const proxyInfo = customCorsProxy ? `custom proxy: ${customCorsProxy}` : 
                     isProduction ? 'Netlify proxy' : 'direct API (requires CORS proxy)'
    
    console.log(`🌐 C3 Client initialized for ${environment} - baseUrl: ${this.baseUrl} (${proxyInfo})`)
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'accept': '*/*',
      'accept-language': 'en,en-US;q=0.9,nl;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'dnt': '1',
      'origin': 'https://launch.comput3.ai',
      'pragma': 'no-cache',
      'priority': 'u=1, i',
      'referer': 'https://launch.comput3.ai/',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'x-c3-api-key': this.apiKey
    }

    return headers
  }

  private buildUrl(endpoint: string): string {
    const fullUrl = `${this.baseUrl}${endpoint}`
    
    // Check for custom CORS proxy in development
    const customCorsProxy = import.meta.env.VITE_CORS_PROXY
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    
    if (!isProduction && customCorsProxy) {
      // In development with custom CORS proxy, prefix the full URL with the proxy
      return `${customCorsProxy}/${fullUrl}`
    }
    
    return fullUrl
  }

  private async makeRequest(endpoint: string, method: string = 'POST', body?: any): Promise<Response> {
    const url = this.buildUrl(endpoint)
    
    const options: RequestInit = {
      method: method,
      headers: this.getHeaders(),
      mode: 'cors'
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    console.log(`🌐 C3 API request: ${method} ${url}`)

    try {
      const response = await fetch(url, options)
      console.log(`📡 C3 API response: ${response.status} ${response.statusText}`)
      return response
    } catch (error) {
      console.error(`❌ C3 API request failed to ${url}:`, error)
      throw error
    }
  }

  async getRunningWorkloads(): Promise<Workload[]> {
    if (!this.apiKey) {
      throw new Error('C3 API key is required')
    }

    try {
      const response = await this.makeRequest('/workloads', 'POST', { running: true })

      if (!response.ok) {
        throw new Error(`Failed to get workloads: ${response.status} - ${response.statusText}`)
      }

      const workloads: any[] = await response.json()
      
      return workloads.map(w => ({
        id: w.workload || w.id,
        workload: w.workload,
        node: w.node,
        type: w.type,
        status: this.determineStatus(w),
        url: w.node ? `https://ui-${w.node}` : undefined,
        expires: w.expires
      }))
    } catch (error) {
      console.error('Error getting workloads:', error)
      throw error
    }
  }

  async getMediaWorkloads(): Promise<Workload[]> {
    const workloads = await this.getRunningWorkloads()
    return workloads.filter(w => w.type?.startsWith('media'))
  }

  async launchWorkload(type: string = 'media:fast', durationHours: number = 10): Promise<string> {
    if (!this.apiKey) {
      throw new Error('C3 API key is required')
    }

    try {
      const expires = Math.floor(Date.now() / 1000) + (durationHours * 3600)
      
      const response = await this.makeRequest('/launch', 'POST', {
        type,
        expires
      })

      if (!response.ok) {
        throw new Error(`Failed to launch workload: ${response.status} - ${response.statusText}`)
      }

      const result = await response.json()
      
      // Try different possible field names for the workload ID
      const workloadId = result.id || result.workload_id || result.workload
      
      if (!workloadId) {
        // Some APIs return success without an immediate ID
        if (result.success || result.status === 'success') {
          return 'pending'
        }
        throw new Error('Launch response does not contain workload ID')
      }

      return workloadId
    } catch (error) {
      console.error('Error launching workload:', error)
      throw error
    }
  }

  async stopWorkload(workloadId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('C3 API key is required')
    }

    try {
      const response = await this.makeRequest('/stop', 'POST', { workload: workloadId })

      if (!response.ok) {
        throw new Error(`Failed to stop workload: ${response.status} - ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Error stopping workload:', error)
      throw error
    }
  }

  async getWorkloadSummary(): Promise<WorkloadSummary> {
    const workloads = await this.getRunningWorkloads()
    const mediaWorkloads = workloads.filter(w => w.type?.startsWith('media'))

    return {
      total_workloads: workloads.length,
      media_workloads: mediaWorkloads.length,
      media_details: mediaWorkloads.map(w => ({
        node: w.node,
        type: w.type,
        id: w.id
      }))
    }
  }

  private determineStatus(workload: any): Workload['status'] {
    // Debug logging to verify status determination
    console.log('Determining status for workload:', {
      id: workload.workload || workload.id,
      type: workload.type,
      status: workload.status,
      state: workload.state,
      running: workload.running
    })

    // This is a simple heuristic - you might need to adjust based on actual API responses
    if (workload.status === 'running' || workload.state === 'running') {
      console.log('-> Determined as healthy')
      return 'healthy'
    }
    if (workload.status === 'launching' || workload.state === 'launching') {
      console.log('-> Determined as launching')
      return 'launching'
    }
    if (workload.status === 'stopping' || workload.state === 'stopping') {
      console.log('-> Determined as stopping')
      return 'stopping'
    }
    console.log('-> Determined as unhealthy (fallback)')
    return 'unhealthy'
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/workloads', 'POST', { running: true })
      
      if (response.ok) {
        console.log('✅ C3 API connection successful')
        return true
      } else {
        console.log(`❌ C3 API connection failed: ${response.status}`)
        return false
      }
    } catch (error) {
      console.log('❌ C3 API connection failed:', error)
      return false
    }
  }
} 