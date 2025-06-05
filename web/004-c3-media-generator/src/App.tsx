import React from 'react'
import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { SetupStep } from './components/SetupStep'
import CSVUploadStep from './components/CSVUploadStep'
import WorkloadStep from './components/WorkloadStep'
import GenerationStep from './components/GenerationStep'
import ResultsStep from './components/ResultsStep'
import StatusBar from './components/StatusBar'
import BatchManagementModal from './components/BatchManagementModal'
import { CheckCircle, Settings, Upload, Zap, BarChart3, Github } from 'lucide-react'

// Social Media Icons
const TelegramIcon = () => (
  <svg width='24' height='24' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <g clipPath='url(#clip0_13_244)'>
      <path d='M14.6842 29.3684C22.7941 29.3684 29.3684 22.7941 29.3684 14.6842C29.3684 6.57435 22.7941 0 14.6842 0C6.57435 0 0 6.57435 0 14.6842C0 22.7941 6.57435 29.3684 14.6842 29.3684Z' fill='currentColor'/>
      <path fillRule='evenodd' clipRule='evenodd' d='M6.64657 14.5291C10.9273 12.6641 13.7818 11.4345 15.2101 10.8405C19.288 9.14432 20.1354 8.84968 20.6877 8.83995C20.8092 8.83781 21.0808 8.86791 21.2567 9.01067C21.4053 9.13121 21.4461 9.29405 21.4657 9.40834C21.4853 9.52262 21.5096 9.78298 21.4903 9.98641C21.2693 12.3083 20.3131 17.943 19.8266 20.5436C19.6208 21.644 19.2155 22.013 18.8231 22.0491C17.9703 22.1275 17.3228 21.4855 16.4969 20.9441C15.2045 20.0969 14.4744 19.5696 13.2199 18.7429C11.7701 17.7875 12.7099 17.2624 13.5361 16.4042C13.7524 16.1796 17.5096 12.7622 17.5823 12.4522C17.5914 12.4134 17.5998 12.2689 17.514 12.1926C17.4281 12.1162 17.3014 12.1423 17.2099 12.1631C17.0803 12.1925 15.0157 13.5571 11.016 16.257C10.43 16.6594 9.89918 16.8555 9.42359 16.8452C8.89929 16.8339 7.89074 16.5488 7.14099 16.3051C6.22139 16.0061 5.49051 15.8481 5.55416 15.3404C5.58731 15.076 5.95144 14.8056 6.64657 14.5291Z' fill='white'/>
    </g>
  </svg>
)

const XIcon = () => (
  <svg width='24' height='24' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <g>
      <path d='M20 40C31.0457 40 40 31.0457 40 20C40 8.95431 31.0457 0 20 0C8.95431 0 0 8.95431 0 20C0 31.0457 8.95431 40 20 40Z' fill='currentColor'/>
    </g>
    <path d='M26.3263 9.90393H29.6998L22.3297 18.3274L31 29.7899H24.2112L18.894 22.838L12.8099 29.7899H9.43443L17.3174 20.78L9 9.90393H15.9611L20.7674 16.2583L26.3263 9.90393ZM25.1423 27.7707H27.0116L14.9454 11.8171H12.9395L25.1423 27.7707Z' fill='white'/>
  </svg>
)

const DiscordIcon = () => (
  <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M20.222 0C21.2405 0 22.0665 0.825952 22.0665 1.84446V24L19.4287 21.6296L17.8424 20.1481L16.1548 18.5926L16.8713 21.1111H3.84446C2.826 21.1111 2 20.2852 2 19.2667V1.84446C2 0.825952 2.826 0 3.84446 0H20.222ZM13.3333 5.68889H13.2815L13.0889 5.9037C15.6815 6.66667 16.9259 7.8037 16.9259 7.8037C15.9704 7.32593 15.0519 6.99259 14.1704 6.77778C13.5185 6.62963 12.8889 6.56296 12.2963 6.54074H12.0074C11.3185 6.56296 10.4815 6.66667 9.52593 7.02222C9.14074 7.17037 8.91852 7.28148 8.91852 7.28148S10.2074 6.10370 12.8889 5.34074L12.7333 5.12593C12.7333 5.12593 10.7852 5.08148 8.62963 6.66667C8.62963 6.66667 6.47407 10.0593 6.47407 14.2667C6.47407 14.2667 7.68889 16.4 10.5556 16.5185C10.5556 16.5185 11.0074 15.9407 11.3704 15.4519C9.57037 14.8815 8.88889 13.7185 8.88889 13.7185S9.03704 13.8222 9.28889 13.9704H9.31111C9.33333 13.9926 9.35556 14.0037 9.37778 14.0259C9.4 14.0481 9.42222 14.0593 9.44444 14.0815C9.78519 14.2667 10.1259 14.4148 10.4296 14.5333C11.0074 14.7556 11.6815 14.9778 12.4593 15.1037C13.4519 15.2667 14.6074 15.3333 15.8815 15.1037C16.4593 15.0037 17.0519 14.8444 17.6815 14.5926C18.0815 14.4296 18.5259 14.2 19.0074 13.8815C19.0074 13.8815 18.3037 15.0667 16.4519 15.6222C16.8148 16.1111 17.2519 16.6667 17.2519 16.6667C20.1185 16.5481 21.3333 14.2667 21.3333 14.2667C21.3333 10.0593 19.1778 6.66667 19.1778 6.66667C17.0222 5.08148 15.0741 5.12593 15.0741 5.12593L13.3333 5.68889ZM10.1926 11.4815C10.9333 11.4815 11.5333 12.1481 11.5185 12.9778C11.5185 13.8074 10.9333 14.474 10.1926 14.474C9.4667 14.474 8.88148 13.8074 8.88148 12.9778C8.88148 12.1481 9.4667 11.4815 10.1926 11.4815ZM14.1037 11.4815C14.8444 11.4815 15.4296 12.1481 15.4296 12.9778C15.4296 13.8074 14.8444 14.474 14.1037 14.474C13.3778 14.474 12.7926 13.8074 12.7926 12.9778C12.8074 12.1481 13.3778 11.4815 14.1037 11.4815Z' fill='currentColor'/>
  </svg>
)

export default function App() {
  const { currentStep, isInitialized, initialize, setCurrentStep } = useAppStore()
  const [batchModalOpen, setBatchModalOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  const steps = [
    { id: 'setup', label: 'Setup', icon: Settings, description: 'Configure C3 API' },
    { id: 'upload', label: 'Upload', icon: Upload, description: 'Load CSV Data' },
    { id: 'workloads', label: 'Workloads', icon: Zap, description: 'GPU Setup' },
    { id: 'generation', label: 'Generate', icon: BarChart3, description: 'Create Media' },
    { id: 'results', label: 'Results', icon: CheckCircle, description: 'View Output' },
  ]

  const getStepIndex = (stepId: string) => steps.findIndex(step => step.id === stepId)
  const currentStepIndex = getStepIndex(currentStep)

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <img src="/images/logo.png" alt="AI Media Studio" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E06] mx-auto"></div>
          <p className="mt-4 text-white font-medium">Loading AI Media Studio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 w-80 bg-gray-800 shadow-xl border-r border-gray-700 flex flex-col h-[90vh] rounded-r-lg z-20">
        {/* Logo and Title */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="AI Media Studio" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-white">AI Media Studio</h1>
              <p className="text-sm text-gray-300">C3 GPU Cluster</p>
            </div>
          </div>
        </div>

        {/* Steps Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Workflow Steps</h2>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const currentIndex = getStepIndex(currentStep)
              const stepIndex = getStepIndex(step.id)
              const isActive = currentStep === step.id
              const isAccessible = stepIndex <= currentIndex || (isInitialized && stepIndex <= currentIndex + 1)
              const isCompleted = stepIndex < currentIndex
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (step.id === 'results') {
                      setBatchModalOpen(true)
                    } else if (isAccessible) {
                      setCurrentStep(step.id as any)
                    }
                  }}
                  disabled={!isAccessible && step.id !== 'results'}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#FF7E06] text-white shadow-lg' 
                      : isCompleted || step.id === 'results'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : isAccessible 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-900 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive 
                        ? 'bg-white text-[#FF7E06]' 
                        : isCompleted 
                          ? 'bg-green-600 text-white' 
                          : isAccessible || step.id === 'results'
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        React.createElement(step.icon, { className: "w-4 h-4" })
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{step.label}</div>
                      <div className="text-xs opacity-75 truncate">{step.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Built on{' '}
              <a 
                href="https://github.com/c3-examples" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#FF7E06] hover:text-[#e06b00] underline"
              >
                GitHub
              </a>
              {' • '}
              <span className="text-gray-500">Open Source</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Top Header - Full Width */}
        <header className="bg-gray-800 shadow-sm border-b border-gray-700 w-full">
          <div className="px-6 py-4 ml-80 mr-16">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {steps.find(s => s.id === currentStep)?.label}
                </h2>
                <p className="text-gray-300 text-sm">
                  {steps.find(s => s.id === currentStep)?.description}
                </p>
              </div>
              <StatusBar />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto ml-80 mr-16">
          <div className="max-w-5xl mx-auto">
            {currentStep === 'setup' && <SetupStep />}
            {currentStep === 'upload' && <CSVUploadStep />}
            {currentStep === 'workloads' && <WorkloadStep />}
            {currentStep === 'generation' && <GenerationStep />}
            {currentStep === 'results' && <ResultsStep />}
          </div>
        </main>
      </div>

      {/* Social Media Sidebar */}
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 w-16 bg-gray-800 shadow-xl border-l border-gray-700 flex flex-col items-center justify-center py-6 h-auto rounded-l-lg z-20">
        <div className="flex flex-col gap-4">
          <a
            href="https://github.com/c3-examples"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-[#FF7E06] hover:text-white transition-all duration-200 group"
            title="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          
          <a
            href="https://x.com/comput3ai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-[#FF7E06] hover:text-white transition-all duration-200 group"
            title="X (Twitter)"
          >
            <XIcon />
          </a>
          
          <a
            href="https://t.me/comput3ai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-[#FF7E06] hover:text-white transition-all duration-200 group"
            title="Telegram"
          >
            <TelegramIcon />
          </a>
          
          <a
            href="https://discord.com/invite/DmaHAdGcNy"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-[#FF7E06] hover:text-white transition-all duration-200 group"
            title="Discord"
          >
            <DiscordIcon />
          </a>
        </div>
      </div>

      {/* Generation History Modal */}
      <BatchManagementModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onViewBatch={(batchId) => {
          console.log('Viewing batch:', batchId)
          setBatchModalOpen(false)
        }}
      />
    </div>
  )
} 