import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useWorkloadStore } from '../stores/workloadStore'
import { Server, Play, Square, RefreshCw, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

export default function WorkloadStep() {
  const { nextStep, previousStep, apiKey } = useAppStore()
  const { 
    workloads, 
    mediaWorkloads, 
    healthyWorkloads, 
    isLoading, 
    error, 
    fetchWorkloads,
    launchWorkload,
    stopWorkload,
    getSummary
  } = useWorkloadStore()
  
  const [launchCount, setLaunchCount] = useState(2)
  const [launchDuration, setLaunchDuration] = useState(60) // Duration in minutes
  const [isLaunching, setIsLaunching] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh workloads every 30 seconds to avoid API overload
  useEffect(() => {
    if (apiKey && autoRefresh) {
      fetchWorkloads(apiKey)
      const interval = setInterval(() => {
        if (autoRefresh && apiKey) {
          fetchWorkloads(apiKey)
        }
      }, 30000) // 30 seconds instead of 10
      
      return () => clearInterval(interval)
    }
  }, [apiKey, autoRefresh, fetchWorkloads])

  const handleLaunchWorkloads = async () => {
    if (!apiKey) return
    
    setIsLaunching(true)
    try {
      // Convert duration from minutes to hours for the API
      const durationInHours = launchDuration / 60
      const promises = Array.from({ length: launchCount }, () => 
        launchWorkload(apiKey, 'media:fast', durationInHours)
      )
      await Promise.all(promises)
    } catch (error) {
      console.error('Failed to launch workloads:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStopWorkload = async (workloadId: string) => {
    if (!apiKey) return
    
    try {
      await stopWorkload(apiKey, workloadId)
    } catch (error) {
      console.error('Failed to stop workload:', error)
    }
  }

  const handleRefresh = () => {
    if (apiKey) {
      fetchWorkloads(apiKey)
    }
  }

  const canProceed = mediaWorkloads.length > 0 && healthyWorkloads.length > 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'launching':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'stopping':
        return <Square className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'launching':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'stopping':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Manage GPU Workloads</h2>
        <p className="text-gray-300">
          Launch and manage GPU instances. More GPUs = faster parallel processing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-[#FF7E06] text-white rounded-full mx-auto mb-3">
            <Server className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{workloads.length}</p>
          <p className="text-gray-300 text-sm">Total Workloads</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{mediaWorkloads.length}</p>
          <p className="text-gray-300 text-sm">Media GPUs</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-full mx-auto mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{healthyWorkloads.length}</p>
          <p className="text-gray-300 text-sm">Healthy GPUs</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white">GPU Instance Controls</h3>
        <p className="text-gray-300 text-sm mb-4">
          Launch new GPU instances for parallel processing. Auto-refresh is enabled.
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-300">Auto-refresh</label>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-[#FF7E06] text-white rounded hover:bg-[#e06b00] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="launch-count" className="text-sm font-medium text-gray-200">
              Launch Count:
            </label>
            <input
              id="launch-count"
              type="number"
              min="1"
              max="10"
              value={launchCount}
              onChange={(e) => setLaunchCount(parseInt(e.target.value) || 1)}
              className="mt-1 block w-20 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-[#FF7E06] focus:border-[#FF7E06]"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="launch-duration" className="text-sm font-medium text-gray-200">
              Duration (minutes):
            </label>
            <select
              id="launch-duration"
              value={launchDuration}
              onChange={(e) => setLaunchDuration(parseInt(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-[#FF7E06] focus:border-[#FF7E06]"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
          
          <button
            onClick={handleLaunchWorkloads}
            disabled={isLaunching || isLoading}
            className="px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] disabled:opacity-50 flex items-center gap-2"
          >
            {isLaunching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Launching...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Launch {launchCount} GPUs
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {mediaWorkloads.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">No Media GPUs Available</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You need at least one media GPU to generate cards. Launch some instances above.
              </p>
            </div>
          </div>
        </div>
      )}

      {workloads.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Running Workloads</h3>
          <div className="space-y-3">
            {workloads.map((workload) => (
              <div key={workload.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-[#FF7E06]" />
                  <div>
                    <p className="font-medium text-white">{workload.node || workload.id}</p>
                    <p className="text-sm text-gray-300">{workload.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(workload.status)}
                    <span className={`text-sm px-2 py-1 rounded border ${getStatusColor(workload.status)}`}>
                      {workload.status}
                    </span>
                  </div>
                  
                  {workload.url && workload.status === 'healthy' && (
                    <a
                      href={workload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF7E06] hover:text-[#e06b00] text-sm underline"
                    >
                      Open UI
                    </a>
                  )}
                  
                  <button
                    onClick={() => handleStopWorkload(workload.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={previousStep}
          className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          ← Back to Mapping
        </button>
        
        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="px-6 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00]"
        >
          Continue to Generation →
        </button>
      </div>
    </div>
  )
} 