import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SessionValidator = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const validateSession = async () => {
      try {
        // Skip validation for 404 page and auth pages to prevent infinite redirects
        if (location.pathname === '/404' || location.pathname === '/not-found' || location.pathname.startsWith('/auth')) {
          setHasSession(true);
          setIsValidating(false);
          return;
        }

        // Check if we have session cookies
        const hasSessionCookie = document.cookie.includes('weam'); // Based on your cookie name
        
        if (hasSessionCookie) {
          setHasSession(true);
        } else {
          // Try to make a simple API call to check if session is valid
          try {
            const response = await fetch('/ai-video/api/health');
            if (response.status === 200) {
              setHasSession(true);
            } else if (response.status === 401) {
              setHasSession(false);
            } else {
              setHasSession(false);
            }
          } catch (apiError) {
            console.error('API check failed:', apiError);
            setHasSession(false);
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
        setHasSession(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [location.pathname]);

  // Skip validation for 404 and auth pages
  if (location.pathname === '/404' || location.pathname === '/not-found' || location.pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access this application.</p>
          <button 
            onClick={() => window.location.href = 'https://app.weam.ai/login'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionValidator;
