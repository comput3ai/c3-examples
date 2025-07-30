import React, { useState } from 'react'
import { Comput3Client } from '../lib/api/comput3'
import { useAppStore } from '../stores/appStore'
import { Shield, AlertCircle, CheckCircle, Info, Network, ExternalLink } from 'lucide-react'

export function SetupStep() {
  const { nextStep, setApiKey } = useAppStore()
  // Clean slate - no pre-filled values for production
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [corsProxy, setCorsProxy] = useState('')
  const [customProxyUrl, setCustomProxyUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [isValid, setIsValid] = useState(false)

  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')

  const validateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setValidationMessage('Please enter your C3 API key')
      setIsValid(false)
      return
    }

    setIsValidating(true)
    setValidationMessage('')

    try {
      // Set the CORS proxy in localStorage for the ComfyUI client to use
      const proxyUrl = corsProxy === 'custom' ? customProxyUrl.trim() : corsProxy
      if (proxyUrl) {
        localStorage.setItem('CORS_PROXY', proxyUrl)
      } else {
        localStorage.removeItem('CORS_PROXY')
      }

      const client = new Comput3Client(apiKeyInput.trim())
      const isConnected = await client.testConnection()
      
      if (isConnected) {
        setValidationMessage('✅ API key validated successfully!')
        setIsValid(true)
        setApiKey(apiKeyInput.trim())
      } else {
        setValidationMessage('❌ Invalid API key or connection failed')
        setIsValid(false)
      }
    } catch (error) {
      console.error('API validation error:', error)
      setValidationMessage('❌ Connection failed. Please check your API key and try again.')
      setIsValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleContinue = () => {
    if (isValid) {
      nextStep()
    }
  }

  const corsProxyOptions = [
    { 
      label: 'No Proxy (Direct)', 
      value: '',
      description: 'Direct connection - works with Netlify proxy or CORS-enabled ComfyUI'
    },
    { 
      label: 'Custom Proxy', 
      value: 'custom',
      description: 'Enter your own CORS proxy URL'
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Shield className="mx-auto h-12 w-12 text-[#FF7E06]" />
        <h2 className="text-2xl font-bold text-white">Setup API Connection</h2>
        <p className="text-gray-300">
          Configure your C3 API key and CORS proxy for ComfyUI access
        </p>
      </div>

      {/* CORS Proxy Configuration */}
      {!isProduction && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Network className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-3">
              <p className="font-medium text-blue-400">CORS Proxy Configuration</p>
              <p className="text-gray-200">
                For local development, you may need a CORS proxy to access external ComfyUI instances:
              </p>
              
              <div className="space-y-2">
                {corsProxyOptions.map((option) => (
                  <label key={option.value} className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="corsProxy"
                      value={option.value}
                      checked={corsProxy === option.value}
                      onChange={(e) => setCorsProxy(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-white font-medium">{option.label}</div>
                      <div className="text-gray-400 text-xs">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {corsProxy === 'custom' && (
                <div className="mt-2">
                  <input
                    type="url"
                    value={customProxyUrl}
                    onChange={(e) => setCustomProxyUrl(e.target.value)}
                    placeholder="https://your-cors-proxy.com"
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FF7E06]/10 border border-[#FF7E06]/30 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-[#FF7E06] mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-[#FF7E06] mb-2">Network Configuration</p>
            <div className="bg-gray-700 rounded p-3">
              {isProduction ? (
                <>
                  <p className="font-medium text-green-400 mb-1">🌐 Production Mode:</p>
                  <p className="text-green-300 text-xs">
                    ComfyUI requests are automatically proxied through Netlify for CORS handling
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-blue-400 mb-1">🔧 Development Mode:</p>
                  <p className="text-blue-300 text-xs">
                    {corsProxy === 'custom' ? `Using CORS proxy: ${customProxyUrl || 'Custom proxy URL not set'}` : corsProxy ? `Using CORS proxy: ${corsProxy}` : 'Direct connection (requires CORS-enabled ComfyUI)'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-200 mb-2">
            C3 API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Enter your C3 API key"
            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7E06] focus:border-[#FF7E06] placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isValidating) {
                validateApiKey()
              }
            }}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={validateApiKey}
            disabled={isValidating || !apiKeyInput.trim()}
            className="px-4 py-2 bg-[#FF7E06] text-white rounded-md hover:bg-[#e06b00] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Validating...</span>
              </>
            ) : (
              <span>Validate Key</span>
            )}
          </button>

          {isValid && (
            <button
              onClick={handleContinue}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Continue</span>
            </button>
          )}
        </div>

        {validationMessage && (
          <div className={`p-3 rounded-md ${
            isValid 
              ? 'bg-green-900/20 border border-green-500/30' 
              : 'bg-red-900/20 border border-red-500/30'
          }`}>
            <p className={`text-sm ${isValid ? 'text-green-300' : 'text-red-300'}`}>
              {validationMessage}
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-white mb-2">Need a C3 API Key?</h3>
        <p className="text-sm text-gray-300 mb-2">
          Get your API key from the C3 dashboard:
        </p>
        <ol className="text-sm text-gray-300 space-y-1 ml-4">
          <li>1. Visit <a href="https://dashboard.comput3.ai" target="_blank" rel="noopener noreferrer" className="text-[#FF7E06] hover:underline">dashboard.comput3.ai</a></li>
          <li>2. Sign in or create an account</li>
          <li>3. Navigate to API Keys section</li>
          <li>4. Generate a new API key</li>
        </ol>
      </div>

      {/* Version info for deployment verification */}
      <div className="text-center text-xs text-gray-500">
        <p>AI Media Studio v1.3.1 • Build {new Date().toISOString().slice(0, 10)}</p>
      </div>
    </div>
  )
} 