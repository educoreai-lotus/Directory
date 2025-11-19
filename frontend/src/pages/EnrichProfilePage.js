// Frontend Page - Enrich Profile Page
// Shown on first login to connect LinkedIn and GitHub

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LinkedInConnectButton from '../components/LinkedInConnectButton';
import GitHubConnectButton from '../components/GitHubConnectButton';

function EnrichProfilePage() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Initialize connection status from user object
  useEffect(() => {
    if (user) {
      setLinkedinConnected(user.hasLinkedIn || false);
      setGithubConnected(user.hasGitHub || false);
    }
  }, [user]);

  // Check URL params for OAuth callback results and refresh user data
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setSuccessMessage(null);
    }

    // If OAuth callback detected, refresh user data to get updated connection status
    if (linkedinParam === 'connected' || githubParam === 'connected') {
      setRefreshing(true);
      refreshUser()
        .then((refreshedUser) => {
          if (refreshedUser) {
            // Update connection status from refreshed user
            setLinkedinConnected(refreshedUser.hasLinkedIn || false);
            setGithubConnected(refreshedUser.hasGitHub || false);
            
            // Show success message
            if (linkedinParam === 'connected') {
              setSuccessMessage('LinkedIn connected successfully! Please connect GitHub to continue.');
            } else if (githubParam === 'connected') {
              setSuccessMessage('GitHub connected successfully! Please connect LinkedIn to continue.');
            }
            
            // Clear success message after 5 seconds
            setTimeout(() => {
              setSuccessMessage(null);
            }, 5000);
          }
        })
        .catch((err) => {
          console.error('Error refreshing user after OAuth:', err);
          // Still set the connection status based on URL param as fallback
          if (linkedinParam === 'connected') {
            setLinkedinConnected(true);
            setSuccessMessage('LinkedIn connected successfully! Please connect GitHub to continue.');
          }
          if (githubParam === 'connected') {
            setGithubConnected(true);
            setSuccessMessage('GitHub connected successfully! Please connect LinkedIn to continue.');
          }
        })
        .finally(() => {
          setRefreshing(false);
          // Clear URL params after processing
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [searchParams, refreshUser]);

  // Auto-redirect to profile when both are connected
  useEffect(() => {
    if (linkedinConnected && githubConnected && user && !refreshing) {
      // Both connected - wait a moment to show success, then redirect
      setSuccessMessage('Both LinkedIn and GitHub connected! Redirecting to your profile...');
      const timer = setTimeout(() => {
        navigate(`/employee/${user.id}`);
      }, 2000); // 2 second delay to show success message

      return () => clearTimeout(timer);
    }
  }, [linkedinConnected, githubConnected, user, navigate, refreshing]);

  // Check if user already has both LinkedIn and GitHub connected - redirect to profile
  useEffect(() => {
    if (user && user.bothOAuthConnected) {
      // Both already connected - redirect to profile immediately
      console.log('[EnrichProfilePage] Both OAuth already connected, redirecting to profile');
      navigate(`/employee/${user.id}`);
    }
  }, [user, navigate]);

  // If no user after loading, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[EnrichProfilePage] No user found, redirecting to login');
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Show loading state while checking auth or refreshing user data
  if (authLoading || refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>
            {refreshing ? 'Refreshing your profile...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If no user after loading, show redirect message
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting to login...</p>
        </div>
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

        {/* Success Messages */}
        {linkedinConnected && !githubConnected && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm">✓ LinkedIn connected successfully! Please connect GitHub to continue.</p>
          </div>
        )}

        {githubConnected && !linkedinConnected && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm">✓ GitHub connected successfully! Please connect LinkedIn to continue.</p>
          </div>
        )}

        {linkedinConnected && githubConnected && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm">✓ Both LinkedIn and GitHub connected! Redirecting to your profile...</p>
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
            alreadyConnected={linkedinConnected}
          />
        </div>

        {/* GitHub Connection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              GitHub
            </h3>
            {githubConnected && (
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: 'rgb(34, 197, 94)'
                  }}
                >
                  <span className="text-green-600 font-bold">✓</span>
                  GitHub enrichment completed
                </span>
              </div>
            )}
          </div>
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            Connect your GitHub account to showcase your projects and code contributions.
          </p>
          <GitHubConnectButton 
            disabled={githubConnected}
            onConnected={() => {
              setGithubConnected(true);
              setSuccessMessage('GitHub connected successfully! Please connect LinkedIn to continue.');
            }}
            alreadyConnected={githubConnected}
          />
        </div>

        {/* Continue Button */}
        {linkedinConnected && githubConnected && (
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
              Both LinkedIn and GitHub are connected. Your profile will be enriched with AI-generated content.
            </p>
          </div>
        )}
        
        {linkedinConnected && !githubConnected && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect your GitHub account to complete profile enrichment.
            </p>
          </div>
        )}

        {githubConnected && !linkedinConnected && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect your LinkedIn account to complete profile enrichment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnrichProfilePage;

