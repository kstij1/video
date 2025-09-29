import React from 'react';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AIVideoStudio from './components/AIVideoStudio';
import VideoEditor from './components/VideoEditor';
import { VideoProvider } from './context/VideoContext';
import { ChatProvider } from './context/ChatContext';
import SessionValidator from './components/providers/SessionValidator';

function App() {
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH || process.env.REACT_APP_API_BASE_PATH || '/ai-video';
  if (typeof window !== 'undefined' && window.location.pathname === '/') {
    window.location.replace(basePath);
    return null;
  }
  return (
    <VideoProvider>
      <ChatProvider>
        <BrowserRouter basename={basePath}>
          <SessionValidator>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<AIVideoStudio />} />
                <Route path="/editor/:videoId" element={<VideoEditor />} />
              </Routes>

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
                    color: '#1e293b',
                    fontSize: '14px',
                    fontWeight: '500',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                }}
              />
            </div>
          </SessionValidator>
        </BrowserRouter>
      </ChatProvider>
    </VideoProvider>
  );
}

export default App;
