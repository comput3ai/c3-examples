import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ServiceSelection from './components/ServiceSelection';
import CSMForm from './components/CSMForm';
import WhisperForm from './components/WhisperForm';
import PortraitForm from './components/PortraitForm';
import AnalyzeForm from './components/AnalyzeForm';
import JobResult from './components/JobResult';
import ApiTester from './components/ApiTester';
import Header from './components/Header';
import JobProvider from './context/JobContext';

function App() {
  return (
    <JobProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<ServiceSelection />} />
              <Route path="/csm" element={<CSMForm />} />
              <Route path="/whisper" element={<WhisperForm />} />
              <Route path="/portrait" element={<PortraitForm />} />
              <Route path="/analyze" element={<AnalyzeForm />} />
              <Route path="/result/:id" element={<JobResult />} />
              <Route path="/api-tester" element={<ApiTester />} />
            </Routes>
          </div>
        </div>
      </Router>
    </JobProvider>
  );
}

export default App;
