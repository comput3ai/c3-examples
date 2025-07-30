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
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')
    const isProduction = forceDevMode ? false : !isLocalhost
    
    if (customApiBase) {
      // Use custom API base URL (for advanced development scenarios)
      this.baseUrl = customApiBase
    } else if (isProduction && window.location.hostname.includes('examples.comput3.ai')) {
      // On examples.comput3.ai, use direct API (CORS is allowed for this domain)
      this.baseUrl = 'https://api.comput3.ai/api/v0'
    } else if (isProduction) {
      // Other production environments: Use Netlify proxy
      this.baseUrl = '/api/comput3'
    } else {
      // Development: Use direct API (through CORS proxy if needed)
      this.baseUrl = 'https://api.comput3.ai/api/v0'
    }
    
    const environment = isProduction ? 'production' : 'development'
    const localStorageCorsProxy = localStorage.getItem('CORS_PROXY')
    const activeCorsProxy = localStorageCorsProxy || customCorsProxy
    
    const proxyInfo = activeCorsProxy ? `CORS proxy: ${activeCorsProxy}` : 
                     window.location.hostname.includes('examples.comput3.ai') ? 'direct API (CORS allowed)' :
                     isProduction ? 'Netlify proxy' : 'direct API (requires CORS proxy)'
    
    console.log(`🌐 C3 Client initialized for ${environment} - baseUrl: ${this.baseUrl} (${proxyInfo})`)
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-c3-api-key': this.apiKey
    }

    return headers
  }

  private buildUrl(endpoint: string): string {
    const fullUrl = `${this.baseUrl}${endpoint}`
    
    // Check for custom CORS proxy in development
    const envCorsProxy = import.meta.env.VITE_CORS_PROXY
    const localStorageCorsProxy = localStorage.getItem('CORS_PROXY')
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    
    // Prefer localStorage proxy (user-configured) over environment variable
    const corsProxy = localStorageCorsProxy || envCorsProxy
    
    if (!isProduction && corsProxy) {
      // Format the CORS proxy URL properly
      let proxyUrl = corsProxy.trim()
      
      // Add http:// if no protocol is specified
      if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
        proxyUrl = `http://${proxyUrl}`
      }
      
      // For CORS Anywhere style proxies, append the target URL
      const proxiedUrl = `${proxyUrl}/${fullUrl}`
      console.log(`🔗 Using CORS proxy: ${proxyUrl} for ${fullUrl} → ${proxiedUrl}`)
      return proxiedUrl
    }
    
    return fullUrl
  }

  private async makeRequest(endpoint: string, method: string = 'POST', body?: any): Promise<Response> {
    const url = this.buildUrl(endpoint)
    const headers = this.getHeaders()
    
    // Check if we're using a CORS proxy in development
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    const localStorageCorsProxy = localStorage.getItem('CORS_PROXY')
    const usingCorsProxy = !isProduction && localStorageCorsProxy
    
    if (usingCorsProxy) {
      // When using CORS proxy, set headers to match the working production setup
      headers['Origin'] = 'https://examples.comput3.ai'
      headers['Referer'] = 'https://examples.comput3.ai/'
      // Remove headers that might cause issues with proxying
      delete headers['Sec-Fetch-Site']
      delete headers['Sec-Fetch-Mode']
      delete headers['Sec-Fetch-Dest']
    }
    
    const options: RequestInit = {
      method: method,
      headers: headers,
      mode: 'cors'
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    console.log(`🌐 C3 API request: ${method} ${url}`)
    if (usingCorsProxy) {
      console.log(`🔧 Using CORS proxy with spoofed origin: https://examples.comput3.ai`)
    }

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