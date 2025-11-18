// Frontend Page - Enrich Profile Page
// Shown on first login to connect LinkedIn and GitHub

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LinkedInConnectButton from '../components/LinkedInConnectButton';

function EnrichProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [error, setError] = useState(null);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    if (linkedinParam === 'connected') {
      setLinkedinConnected(true);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  // Check if user already has LinkedIn connected
  useEffect(() => {
    if (user) {
      // Check if LinkedIn is already connected (from user profile)
      // This would come from the employee profile data
      // For now, we'll check after fetching profile
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to enrich your profile.</p>
      </div>
    );
  }

  const handleContinue = () => {
    // Once both LinkedIn and GitHub are connected, proceed to enrichment
    // For now, just redirect to employee profile
    // In F009A, this will trigger Gemini AI enrichment
    navigate(`/employee/${user.id}`);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative py-12 px-4" 
      style={{
        background: 'var(--bg-body, var(--bg-primary))',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
      }}
    >
      <div 
        className="max-w-2xl w-full mx-4 rounded-lg shadow-lg border p-8"
        style={{
          background: 'var(--gradient-card)',
          borderRadius: 'var(--radius-card, 8px)',
          boxShadow: 'var(--shadow-card)',
          borderColor: 'var(--border-default)'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Enrich Your Profile
          </h1>
          <p 
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your LinkedIn and GitHub accounts to enhance your profile
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-error)',
              color: 'var(--text-error)'
            }}
          >
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* LinkedIn Connection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              LinkedIn
            </h3>
            {linkedinConnected && (
              <span 
                className="text-sm px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: 'rgb(34, 197, 94)'
                }}
              >
                ✓ Connected
              </span>
            )}
          </div>
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your LinkedIn account to import your professional profile and experience.
          </p>
          <LinkedInConnectButton 
            disabled={linkedinConnected}
            onConnected={() => setLinkedinConnected(true)}
          />
        </div>

        {/* GitHub Connection - Placeholder for F009 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              GitHub
            </h3>
            {githubConnected && (
              <span 
                className="text-sm px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: 'rgb(34, 197, 94)'
                }}
              >
                ✓ Connected
              </span>
            )}
          </div>
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your GitHub account to showcase your projects and code contributions.
          </p>
          <button
            disabled
            className="btn btn-secondary w-full"
            style={{
              opacity: 0.5,
              cursor: 'not-allowed'
            }}
          >
            Coming Soon (F009)
          </button>
        </div>

        {/* Continue Button */}
        {linkedinConnected && (
          <div className="mt-8">
            <button
              onClick={handleContinue}
              className="btn btn-primary w-full"
            >
              Continue to Profile
            </button>
            <p 
              className="text-xs text-center mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              Note: GitHub connection will be available in the next update. You can continue with LinkedIn for now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnrichProfilePage;

