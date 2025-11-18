// Frontend Component - GitHub Connect Button
// Button to initiate GitHub OAuth flow

import React, { useState } from 'react';
import { getGitHubAuthUrl } from '../services/oauthService';

function GitHubConnectButton({ onConnected, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authorization URL from backend
      const { authorizationUrl } = await getGitHubAuthUrl();

      // Redirect to GitHub OAuth
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('GitHub connect error:', error);
      setError(error.response?.data?.response?.error || 'Failed to connect GitHub. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={disabled || loading}
        className="btn btn-primary w-full flex items-center justify-center gap-2"
        style={{
          opacity: (disabled || loading) ? 0.6 : 1,
          cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #24292e 0%, #1a1e22 100%)',
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
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
            </svg>
            <span>Connect GitHub</span>
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

export default GitHubConnectButton;

