import React from 'react';
import { Link } from 'react-router-dom';
import { SpeakerWaveIcon, MicrophoneIcon, VideoCameraIcon, PhotoIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Transform Content with AI Rendering
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-indigo-100">
                Powerful tools for speech, text, and image processing with Comput3
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/csm"
                  className="bg-white text-indigo-700 hover:bg-indigo-100 px-8 py-3 rounded-lg font-medium flex items-center transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                  <ArrowRightIcon className="ml-2 w-5 h-5" />
                </Link>
                <a
                  href="https://c3-examples.com/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-700 px-8 py-3 rounded-lg font-medium transition-all"
                >
                  Learn About Comput3
                </a>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000"></div>
                <div className="relative">
                  <div className="p-8 bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white border-opacity-20">
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { icon: <SpeakerWaveIcon className="w-10 h-10" />, label: "Text to Speech" },
                        { icon: <MicrophoneIcon className="w-10 h-10" />, label: "Speech to Text" },
                        { icon: <VideoCameraIcon className="w-10 h-10" />, label: "Portrait Video" },
                        { icon: <PhotoIcon className="w-10 h-10" />, label: "Image Analysis" }
                      ].map((item, index) => (
                        <div key={index} className="flex flex-col items-center p-4 bg-white bg-opacity-20 rounded-xl">
                          <div className="text-white mb-2">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-800">AI-Powered Content Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <SpeakerWaveIcon className="w-12 h-12 text-indigo-600" />,
                title: "Text to Speech",
                description: "Generate natural-sounding speech from text using the Collaborative Speech Model.",
                link: "/csm",
                bgColor: "bg-blue-50"
              },
              {
                icon: <MicrophoneIcon className="w-12 h-12 text-purple-600" />,
                title: "Speech to Text",
                description: "Transcribe audio to text with high accuracy using the Whisper model.",
                link: "/whisper",
                bgColor: "bg-purple-50"
              },
              {
                icon: <VideoCameraIcon className="w-12 h-12 text-indigo-600" />,
                title: "Portrait Video",
                description: "Create a speaking portrait video from an image and audio.",
                link: "/portrait",
                bgColor: "bg-indigo-50"
              },
              {
                icon: <PhotoIcon className="w-12 h-12 text-pink-600" />,
                title: "Image Analysis",
                description: "Analyze images using a vision model to extract information and insights.",
                link: "/analyze",
                bgColor: "bg-pink-50"
              }
            ].map((feature, index) => (
              <div key={index} className={`rounded-xl p-8 shadow-lg transition-all hover:shadow-xl ${feature.bgColor} hover:scale-105`}>
                <div className="mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <Link 
                  to={feature.link} 
                  className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800"
                >
                  Try it now
                  <ArrowRightIcon className="ml-2 w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Content?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Start leveraging the power of Comput3 AI for your speech, text, and image processing needs.
          </p>
          <a
            href="https://c3-examples.com/order-gpu"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white px-10 py-4 rounded-lg text-xl font-bold transition-all inline-flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            ORDER YOUR GPU NOW
            <ArrowRightIcon className="ml-3 w-6 h-6" />
          </a>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 