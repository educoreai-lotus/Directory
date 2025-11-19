// Frontend Component - LinkedIn Connect Button
// Button to initiate LinkedIn OAuth flow

import React, { useState } from 'react';
import { getLinkedInAuthUrl } from '../services/oauthService';

function LinkedInConnectButton({ onConnected, disabled = false, alreadyConnected = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify token exists before making request
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('You must be logged in to connect LinkedIn. Please log in first.');
      }

      console.log('[LinkedInConnectButton] Token present, requesting authorization URL...');
      
      // Get authorization URL from backend
      const result = await getLinkedInAuthUrl();
      console.log('[LinkedInConnectButton] Received result:', result);
      
      const { authorizationUrl } = result;
      console.log('[LinkedInConnectButton] authorizationUrl:', authorizationUrl);
      
      if (!authorizationUrl) {
        throw new Error('Authorization URL is missing');
      }

      // Redirect to LinkedIn OAuth
      console.log('[LinkedInConnectButton] Redirecting to LinkedIn OAuth...');
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('[LinkedInConnectButton] LinkedIn connect error:', error);
      const errorMessage = error.response?.data?.response?.error 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to connect LinkedIn. Please try again.';
      
      setError(errorMessage);
      setLoading(false);
      
      // Don't redirect to login - just show error
      // The user is already on the enrich page, they should stay there
    }
  };

  if (alreadyConnected) {
    return (
      <div className="space-y-2">
        <button
          disabled
          className="btn btn-primary w-full flex items-center justify-center gap-2"
          style={{
            opacity: 0.6,
            cursor: 'not-allowed',
            background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
            border: 'none'
          }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span>✓ LinkedIn Already Connected</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={disabled || loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2"
        style={{
          opacity: (disabled || loading) ? 0.6 : 1,
          cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
          border: 'none'
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span>Connect LinkedIn</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="text-sm" style={{ color: 'var(--text-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default LinkedInConnectButton;

