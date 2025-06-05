import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useCSVStore } from '../stores/csvStore'
import { useGenerationStore } from '../stores/generationStore'
import { Github, Heart } from 'lucide-react'

export default function StatusBar() {
  const { apiKey } = useAppStore()
  const { validatedCards } = useCSVStore() 
  const { isGenerating } = useGenerationStore()

  return (
    <div className="flex items-center gap-6 text-sm">
      {/* GitHub Contribution Invitation - Always Visible */}
      <a
        href="https://www.github.com/c3-examples/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-[#FF7E06] text-gray-300 hover:text-white rounded-lg transition-all duration-200 border border-gray-600 hover:border-[#FF7E06]"
      >
        <Github className="w-4 h-4" />
        <span className="font-medium">Contribute</span>
        <Heart className="w-3 h-3" />
      </a>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white font-medium">
            API {apiKey ? 'Connected' : 'Not Set'}
          </span>
        </div>
        
        {validatedCards.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF7E06]" />
            <span className="text-white">
              {validatedCards.length} Items Ready
            </span>
          </div>
        )}
        
        {isGenerating && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-white">
              Processing
            </span>
          </div>
        )}
      </div>
    </div>
  )
} 