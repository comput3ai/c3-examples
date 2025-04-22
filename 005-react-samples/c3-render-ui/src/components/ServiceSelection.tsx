import React from 'react';
import { Link } from 'react-router-dom';
import { SpeakerWaveIcon, MicrophoneIcon, VideoCameraIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon, to }) => {
  return (
    <Link 
      to={to}
      className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 text-indigo-600 mr-3">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
};

const ServiceSelection: React.FC = () => {
  const services = [
    {
      id: 'csm',
      title: 'Text to Speech (CSM)',
      description: 'Generate natural-sounding speech from text using the Collaborative Speech Model.',
      icon: <SpeakerWaveIcon className="w-full h-full" />,
      to: '/csm'
    },
    {
      id: 'whisper',
      title: 'Speech to Text (Whisper)',
      description: 'Transcribe audio to text with high accuracy using the Whisper model.',
      icon: <MicrophoneIcon className="w-full h-full" />,
      to: '/whisper'
    },
    {
      id: 'portrait',
      title: 'Portrait Video',
      description: 'Create a speaking portrait video from an image and audio.',
      icon: <VideoCameraIcon className="w-full h-full" />,
      to: '/portrait'
    },
    {
      id: 'analyze',
      title: 'Image Analysis',
      description: 'Analyze images using a vision model to extract information and insights.',
      icon: <PhotoIcon className="w-full h-full" />,
      to: '/analyze'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">C3 Render Services</h1>
      <p className="text-gray-600 mb-8">Select a service to get started with your AI rendering task.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            icon={service.icon}
            to={service.to}
          />
        ))}
      </div>
    </div>
  );
};

export default ServiceSelection; 