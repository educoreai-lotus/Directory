// Frontend Page - Enrich Profile Page
// Shown on first login to connect LinkedIn and GitHub

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LinkedInConnectButton from '../components/LinkedInConnectButton';
import GitHubConnectButton from '../components/GitHubConnectButton';
// PHASE_4: Import new components for extended enrichment flow
import UploadCVSection from '../components/UploadCVSection';
import ManualProfileForm from '../components/ManualProfileForm';
import { triggerEnrichment, getEnrichmentStatus, saveManualData } from '../services/enrichmentService';

function EnrichProfilePage() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  // PHASE_4: State for new enrichment sources
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [manualDataSaved, setManualDataSaved] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    skills: '',
    education: '',
    work_experience: ''
  });
  const [enriching, setEnriching] = useState(false);

  // Initialize connection status from user object (only on initial load, not after OAuth)
  // This ensures we show the correct state when the page first loads
  useEffect(() => {
    if (user && !refreshing) {
      // Only update if we're not currently refreshing (to avoid overwriting OAuth callback updates)
      const linkedinStatus = user.hasLinkedIn || false;
      const githubStatus = user.hasGitHub || false;
      
      // Only update if status actually changed (to avoid unnecessary re-renders)
      if (linkedinStatus !== linkedinConnected) {
        setLinkedinConnected(linkedinStatus);
      }
      if (githubStatus !== githubConnected) {
        setGithubConnected(githubStatus);
      }
    }
  }, [user]); // Only depend on user, not on linkedinConnected/githubConnected to avoid loops

  // Check URL params for OAuth callback results and refresh user data
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    const errorParam = searchParams.get('error');
    const tokenParam = searchParams.get('token');
    
    // Determine if this is an OAuth callback (success indicators, not errors)
    const isOAuthCallback = linkedinParam === 'connected' || githubParam === 'connected';

    // CRITICAL: Extract and store token + user from OAuth callback if present
    const userParam = searchParams.get('user');
    if (tokenParam && userParam) {
      console.log('[EnrichProfilePage] Token and user received from OAuth callback, storing in localStorage');
      
      // Decode user data from base64
      try {
        const userDataJson = atob(userParam);
        const userData = JSON.parse(userDataJson);
        
        // Store both token and user in localStorage
        localStorage.setItem('auth_token', tokenParam);
        localStorage.setItem('user', JSON.stringify(userData));
        // Set OAuth callback flag to prevent AuthContext from validating immediately
        localStorage.setItem('oauth_callback_timestamp', Date.now().toString());
        
        console.log('[EnrichProfilePage] Token and user stored successfully:', {
          token: tokenParam.substring(0, 30) + '...',
          userId: userData.id,
          email: userData.email
        });
      } catch (error) {
        console.error('[EnrichProfilePage] Failed to decode user data from OAuth callback:', error);
        // Still store token even if user decode fails
        localStorage.setItem('auth_token', tokenParam);
      }
    } else if (tokenParam) {
      // Only token, no user - store token but warn
      console.warn('[EnrichProfilePage] Token received but no user data in OAuth callback');
      localStorage.setItem('auth_token', tokenParam);
      // Set OAuth callback flag
      localStorage.setItem('oauth_callback_timestamp', Date.now().toString());
    }

    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      
      // Handle specific LinkedIn OAuth errors with helpful messages
      if (decodedError.includes('unauthorized_scope_error') || decodedError.includes('LinkedIn app does not have required permissions')) {
        setError('LinkedIn connection failed: The LinkedIn app does not have the required permissions. Please check the LinkedIn Developer Portal settings. See the documentation for setup instructions.');
      } else {
        setError(decodedError);
      }
      
      setSuccessMessage(null);
      return;
    }

    // If OAuth callback detected, use stored user data (don't call /auth/me)
    if (linkedinParam === 'connected' || githubParam === 'connected') {
      setRefreshing(true);
      
      // Get user from localStorage (should be stored from OAuth callback)
      const token = localStorage.getItem('auth_token');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      
      if (token && storedUser) {
        // Use stored user directly - don't call /auth/me during OAuth callback
        console.log('[EnrichProfilePage] OAuth callback detected, using stored user from localStorage (skipping /auth/me)');
        
        // Update connection status from stored user
        const newLinkedinStatus = storedUser.hasLinkedIn || false;
        const newGithubStatus = storedUser.hasGitHub || false;
        
        setLinkedinConnected(newLinkedinStatus);
        setGithubConnected(newGithubStatus);
        
        // Show success message based on what was just connected
        const enrichedParam = searchParams.get('enriched');
        if (linkedinParam === 'connected' && !newGithubStatus) {
          setSuccessMessage('✓ LinkedIn connected successfully! Please connect GitHub to continue.');
        } else if (githubParam === 'connected' && !newLinkedinStatus) {
          setSuccessMessage('✓ GitHub connected successfully! Please connect LinkedIn to continue.');
        } else if (newLinkedinStatus && newGithubStatus) {
          if (enrichedParam === 'true') {
            setSuccessMessage('✓ Both LinkedIn and GitHub connected! Profile enriched successfully. Redirecting...');
          } else {
            setSuccessMessage('✓ Both LinkedIn and GitHub connected! Enriching your profile...');
          }
        }
        
        // Clear success message after 5 seconds (unless both are connected, then redirect will happen)
        if (!(newLinkedinStatus && newGithubStatus)) {
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
        
        setRefreshing(false);
        // Clear URL params after processing (but keep token and user in localStorage)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token'); // Remove token from URL for security
        newUrl.searchParams.delete('user'); // Remove user from URL for security
        newUrl.searchParams.delete('linkedin'); // Clear OAuth callback param
        newUrl.searchParams.delete('github'); // Clear OAuth callback param
        newUrl.searchParams.delete('enriched'); // Clear enrichment param
        window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        
        // Clear OAuth flag after a short delay to allow AuthContext to see it
        setTimeout(() => {
          localStorage.removeItem('oauth_callback_timestamp');
        }, 5000); // 5 seconds should be enough for AuthContext to initialize
        
        return; // Don't call refreshUser - we already have the user
      }
      
      // Fallback: if no stored user, try refreshUser (but this shouldn't happen)
      console.warn('[EnrichProfilePage] OAuth callback but no stored user, attempting refreshUser as fallback');
      refreshUser()
        .then((refreshedUser) => {
          // If refreshUser returns null but we have stored user, use stored user
          const finalUser = refreshedUser || storedUser;
          
          if (finalUser) {
            // Update connection status from refreshed user (from database, not URL params)
            const newLinkedinStatus = finalUser.hasLinkedIn || false;
            const newGithubStatus = finalUser.hasGitHub || false;
            
            setLinkedinConnected(newLinkedinStatus);
            setGithubConnected(newGithubStatus);
            
            // Show success message based on what was just connected
            const enrichedParam = searchParams.get('enriched');
            if (linkedinParam === 'connected' && !newGithubStatus) {
              setSuccessMessage('✓ LinkedIn connected successfully! Please connect GitHub to continue.');
            } else if (githubParam === 'connected' && !newLinkedinStatus) {
              setSuccessMessage('✓ GitHub connected successfully! Please connect LinkedIn to continue.');
            } else if (newLinkedinStatus && newGithubStatus) {
              if (enrichedParam === 'true') {
                setSuccessMessage('✓ Both LinkedIn and GitHub connected! Profile enriched successfully. Redirecting...');
              } else {
                setSuccessMessage('✓ Both LinkedIn and GitHub connected! Enriching your profile...');
              }
            }
            
            // Clear success message after 5 seconds (unless both are connected, then redirect will happen)
            if (!(newLinkedinStatus && newGithubStatus)) {
              setTimeout(() => {
                setSuccessMessage(null);
              }, 5000);
            }
          } else {
            // No user from refresh or localStorage - fallback to URL params
            console.warn('[EnrichProfilePage] No user available, using URL params as fallback');
            if (linkedinParam === 'connected') {
              setLinkedinConnected(true);
              setSuccessMessage('✓ LinkedIn connected successfully! Please connect GitHub to continue.');
            }
            if (githubParam === 'connected') {
              setGithubConnected(true);
              setSuccessMessage('✓ GitHub connected successfully! Please connect LinkedIn to continue.');
            }
          }
        })
        .catch((err) => {
          console.error('Error refreshing user after OAuth:', err);
          // Fallback: use stored user or URL params
          if (storedUser) {
            const newLinkedinStatus = storedUser.hasLinkedIn || linkedinParam === 'connected';
            const newGithubStatus = storedUser.hasGitHub || githubParam === 'connected';
            setLinkedinConnected(newLinkedinStatus);
            setGithubConnected(newGithubStatus);
          } else {
            // Fallback: set connection status based on URL param
            if (linkedinParam === 'connected') {
              setLinkedinConnected(true);
              setSuccessMessage('✓ LinkedIn connected successfully! Please connect GitHub to continue.');
            }
            if (githubParam === 'connected') {
              setGithubConnected(true);
              setSuccessMessage('✓ GitHub connected successfully! Please connect LinkedIn to continue.');
            }
          }
        })
        .finally(() => {
          setRefreshing(false);
          // Clear URL params after processing (but keep token in localStorage)
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token'); // Remove token from URL for security
          newUrl.searchParams.delete('user'); // Remove user from URL for security
          newUrl.searchParams.delete('linkedin'); // Clear OAuth callback param
          newUrl.searchParams.delete('github'); // Clear OAuth callback param
          newUrl.searchParams.delete('enriched'); // Clear enrichment param
          window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
        });
    }
  }, [searchParams, refreshUser]);

  // Auto-redirect to profile when both are connected AND enrichment is complete
  useEffect(() => {
    const enrichedParam = searchParams.get('enriched');
    const isEnriched = enrichedParam === 'true';
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    const isOAuthCallback = linkedinParam === 'connected' || githubParam === 'connected';
    
    // Only redirect if both are connected AND enrichment is complete AND we're not in the middle of connecting
    if (linkedinConnected && githubConnected && user && !refreshing && isEnriched && !isOAuthCallback) {
      // Enrichment completed - redirect to profile
      setSuccessMessage('✓ Profile enriched successfully! Redirecting to your profile...');
      const timer = setTimeout(() => {
        navigate(`/employee/${user.id}?enrichment=complete`);
      }, 2000); // 2 second delay to show success message

      return () => clearTimeout(timer);
    } else if (linkedinConnected && githubConnected && user && !refreshing && !isEnriched) {
      // Both connected but enrichment not yet complete - show waiting message
      // But only if we're not in the middle of an OAuth callback
      if (!isOAuthCallback) {
        setSuccessMessage('✓ Both LinkedIn and GitHub connected! Enriching your profile...');
      }
    }
  }, [linkedinConnected, githubConnected, user, navigate, refreshing, searchParams]);

  // CRITICAL: Check if user has already completed enrichment - redirect immediately
  // Enrichment is ONE-TIME only - if already enriched, never show this page again
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    const isOAuthCallback = linkedinParam === 'connected' || githubParam === 'connected';
    
    // Don't redirect during OAuth callback - let the OAuth callback handler manage the flow
    if (isOAuthCallback) {
      return;
    }
    
    // If user has already completed enrichment (enriched or approved status), redirect immediately
    if (user && (user.profileStatus === 'enriched' || user.profileStatus === 'approved')) {
      console.log('[EnrichProfilePage] User has already completed enrichment, redirecting to profile');
      navigate(`/employee/${user.id}`);
      return;
    }
    
    // If both OAuth are already connected (but enrichment not yet complete), redirect to profile
    // This handles the case where enrichment is in progress
    if (user && linkedinConnected && githubConnected && user.bothOAuthConnected) {
      console.log('[EnrichProfilePage] Both OAuth already connected, redirecting to profile');
      navigate(`/employee/${user.id}`);
    }
  }, [user, navigate, linkedinConnected, githubConnected, searchParams]);

  // If no user after loading, redirect to login
  // BUT: Don't redirect if we just came from OAuth callback (check URL params first)
  useEffect(() => {
    // Check if we're coming from OAuth callback - if so, NEVER redirect to login
    // OAuth callbacks include: success indicators, errors, tokens, or enriched status
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    const errorParam = searchParams.get('error');
    const enrichedParam = searchParams.get('enriched');
    const tokenParam = searchParams.get('token');
    
    // OAuth callback is detected by any of these indicators
    // Use !! to ensure boolean, not string value
    const isOAuthCallback = linkedinParam === 'connected' || 
                            githubParam === 'connected' || 
                            !!errorParam ||  // OAuth errors are still OAuth callbacks
                            enrichedParam === 'true' ||
                            !!tokenParam;     // Token in URL indicates OAuth callback

    console.log('[EnrichProfilePage] Auth check - loading:', authLoading, 'user:', !!user, 'refreshing:', refreshing, 'isOAuthCallback:', isOAuthCallback);

    // During OAuth callback, ALWAYS try to restore user from localStorage
    if (isOAuthCallback && !user && !authLoading) {
      const token = localStorage.getItem('auth_token');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      
      console.log('[EnrichProfilePage] OAuth callback detected - token:', !!token, 'storedUser:', !!storedUser);
      
      if (token && storedUser) {
        console.log('[EnrichProfilePage] Restoring user from localStorage during OAuth callback');
        // Don't call refreshUser here - it might clear the token
        // Instead, wait for AuthContext to restore it
        // But if AuthContext doesn't, we'll show the page anyway
        return; // Don't redirect, let the page render
      } else if (storedUser) {
        // Even if token is missing, preserve user during OAuth
        console.warn('[EnrichProfilePage] Token missing but user exists during OAuth - preserving');
        return; // Don't redirect
      } else {
        console.warn('[EnrichProfilePage] No token or user during OAuth callback - but not redirecting');
        return; // Don't redirect during OAuth callback
      }
    }

    // Normal flow (not OAuth callback) - check auth and redirect if needed
    if (!authLoading && !user && !refreshing && !isOAuthCallback) {
      // Double-check token exists before redirecting
      const token = localStorage.getItem('auth_token');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      
      if (!token) {
        console.log('[EnrichProfilePage] No user and no token, redirecting to login');
        navigate('/login');
      } else if (storedUser) {
        // Token exists and we have stored user - restore from localStorage
        console.log('[EnrichProfilePage] Token exists, restoring user from localStorage');
        // Wait a bit for AuthContext to restore
        setTimeout(() => {
          if (!user) {
            console.log('[EnrichProfilePage] User still null after timeout, redirecting to login');
            navigate('/login');
          }
        }, 2000);
      } else {
        // Token exists but user is null - might be a validation issue
        console.log('[EnrichProfilePage] Token exists but user is null, attempting to refresh...');
        refreshUser()
          .then((refreshedUser) => {
            if (!refreshedUser) {
              console.log('[EnrichProfilePage] Refresh failed, redirecting to login');
              navigate('/login');
            }
          })
          .catch(() => {
            console.log('[EnrichProfilePage] Refresh error, redirecting to login');
            navigate('/login');
          });
      }
    }
  }, [authLoading, user, navigate, refreshing, refreshUser, searchParams]);

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

  // PHASE_4: Handle Continue button - trigger enrichment
  const handleContinue = async () => {
    if (!user?.id) {
      setError('User ID is missing');
      return;
    }

    // Determine if user has ANY real enrichment source (GitHub or PDF, NOT LinkedIn)
    const hasRealDataSource = githubConnected || pdfUploaded;

    // Check if manual form is empty (safely handle undefined/null values)
    const isManualFormEmpty = 
      (!manualFormData?.skills || (typeof manualFormData.skills === 'string' && manualFormData.skills.trim() === "")) &&
      (!manualFormData?.education || (typeof manualFormData.education === 'string' && manualFormData.education.trim() === "")) &&
      (!manualFormData?.work_experience || (typeof manualFormData.work_experience === 'string' && manualFormData.work_experience.trim() === ""));

    // If user has no real data source, manual form becomes required
    if (!hasRealDataSource && isManualFormEmpty) {
      setError('To enrich your profile without GitHub or CV, you must fill at least one field in the form.');
      return;
    }

    try {
      setEnriching(true);
      setError(null);
      setSuccessMessage('Enriching your profile... This may take a moment.');

      // CRITICAL: Save manual form data before enrichment (if form has data)
      // Ensure manual data is saved to backend before triggering enrichment
      if (!isManualFormEmpty) {
        // Normalize form data to ensure all keys are strings
        const formDataToSave = {
          skills: (manualFormData?.skills && typeof manualFormData.skills === 'string') ? manualFormData.skills : '',
          education: (manualFormData?.education && typeof manualFormData.education === 'string') ? manualFormData.education : '',
          work_experience: (manualFormData?.work_experience && typeof manualFormData.work_experience === 'string') ? manualFormData.work_experience : ''
        };

        console.log('Sending manual data:', formDataToSave);
        
        await saveManualData(user.id, formDataToSave);
        setManualDataSaved(true);
      }

      // PHASE_4: Trigger enrichment via backend
      const result = await triggerEnrichment(user.id);

      // SAFE FALLBACK: Accept success even if data is minimal/empty
      // Backend now returns success with empty fields instead of throwing errors
      if (result?.success !== false && (result?.employee || result?.response?.employee || result?.response)) {
        setSuccessMessage('✓ Profile enriched successfully! Redirecting to your profile...');
        
        // Redirect after short delay
        setTimeout(() => {
          navigate(`/employee/${user.id}?enrichment=complete`);
        }, 2000);
      } else {
        // Only throw if explicitly marked as failed
        const errorMsg = result?.error || result?.response?.error;
        if (errorMsg && !errorMsg.includes('Insufficient data')) {
          throw new Error(errorMsg);
        } else {
          // Even if data is insufficient, treat as success (backend handles it gracefully)
          setSuccessMessage('✓ Profile updated! Redirecting to your profile...');
          setTimeout(() => {
            navigate(`/employee/${user.id}?enrichment=complete`);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('[EnrichProfilePage] Enrichment error:', err);
      const errorMessage = err.response?.data?.response?.error 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to enrich profile. Please try again.';
      setError(errorMessage);
      setSuccessMessage(null);
    } finally {
      setEnriching(false);
    }
  };

  // PHASE_4: Handle skip - navigate to profile without enrichment
  const handleSkip = () => {
    if (user?.id) {
      navigate(`/employee/${user.id}`);
    }
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
            Choose any enrichment method to enhance your profile
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

        {/* Success Messages - Show dynamic message from state */}
        {successMessage && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Card 1: LinkedIn Connection */}
        <div 
          className="mb-4 rounded-lg border p-6"
          style={{
            background: 'var(--gradient-card)',
            borderRadius: 'var(--radius-card, 8px)',
            boxShadow: 'var(--shadow-card)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              LinkedIn
            </h3>
            {linkedinConnected && (
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: 'rgb(34, 197, 94)'
                  }}
                >
                  <span className="text-green-600 font-bold">✓</span>
                  Connected
                </span>
              </div>
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

        {/* Card 2: GitHub Connection */}
        <div 
          className="mb-4 rounded-lg border p-6"
          style={{
            background: 'var(--gradient-card)',
            borderRadius: 'var(--radius-card, 8px)',
            boxShadow: 'var(--shadow-card)',
            borderColor: 'var(--border-default)'
          }}
        >
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
                  Connected
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

        {/* Card 3: PDF CV Upload Section */}
        <div 
          className="mb-4 rounded-lg border p-6"
          style={{
            background: 'var(--gradient-card)',
            borderRadius: 'var(--radius-card, 8px)',
            boxShadow: 'var(--shadow-card)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Upload Your CV (PDF)
            </h3>
            {pdfUploaded && (
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: 'rgb(34, 197, 94)'
                  }}
                >
                  <span className="text-green-600 font-bold">✓</span>
                  Uploaded
                </span>
              </div>
            )}
          </div>
          <UploadCVSection 
            employeeId={user?.id}
            onUploaded={(result) => {
              setPdfUploaded(true);
              setSuccessMessage('✓ CV uploaded successfully!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
          />
        </div>

        {/* Card 4: Manual Profile Form Section */}
        <div 
          className="mb-4 rounded-lg border p-6"
          style={{
            background: 'var(--gradient-card)',
            borderRadius: 'var(--radius-card, 8px)',
            boxShadow: 'var(--shadow-card)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="mb-3">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Manual Details
            </h3>
            <p 
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Fill in your work experience, skills, and education manually
            </p>
          </div>
          <ManualProfileForm 
            employeeId={user?.id}
            isRequired={!githubConnected && !pdfUploaded}
            onSaved={(result) => {
              setManualDataSaved(true);
              setSuccessMessage('✓ Manual data saved successfully!');
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
            onFormDataChange={(formData) => {
              // Track manual form data state for validation
              // Ensure formData always has all required keys with string values
              const safeFormData = {
                skills: (formData?.skills && typeof formData.skills === 'string') ? formData.skills : '',
                education: (formData?.education && typeof formData.education === 'string') ? formData.education : '',
                work_experience: (formData?.work_experience && typeof formData.work_experience === 'string') ? formData.work_experience : ''
              };
              
              setManualFormData(safeFormData);
              
              // Update manualDataSaved based on whether form has data
              const isManualFormEmpty = 
                (!safeFormData.skills || safeFormData.skills.trim() === "") &&
                (!safeFormData.education || safeFormData.education.trim() === "") &&
                (!safeFormData.work_experience || safeFormData.work_experience.trim() === "");
              
              setManualDataSaved(!isManualFormEmpty);
            }}
          />
        </div>

        {/* Continue Button */}
        {/* PHASE_4: Updated to check for any source, not just both OAuth */}
        {(linkedinConnected || githubConnected || pdfUploaded || manualDataSaved) && (
          <div className="mt-8">
            <button
              onClick={handleContinue}
              disabled={enriching}
              className="btn btn-primary w-full"
              style={{
                opacity: enriching ? 0.6 : 1,
                cursor: enriching ? 'not-allowed' : 'pointer'
              }}
            >
              {enriching ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Enriching Profile...
                </>
              ) : (
                'Continue to Your Profile'
              )}
            </button>
            <p 
              className="text-xs text-center mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              {linkedinConnected && githubConnected 
                ? 'Both LinkedIn and GitHub are connected. Your profile will be enriched with AI-generated content.'
                : 'Your profile will be enriched with AI-generated content using the data you provided.'
              }
            </p>
          </div>
        )}
        
        {/* PHASE_4: Show message if no sources connected yet */}
        {!linkedinConnected && !githubConnected && !pdfUploaded && !manualDataSaved && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect at least one data source (LinkedIn, GitHub, upload CV, or fill manual form) to continue.
            </p>
          </div>
        )}

        {/* PHASE_4: Skip for now link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            className="text-sm underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Skip for now
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            You can complete enrichment later from your profile page
          </p>
        </div>
      </div>
    </div>
  );
}

export default EnrichProfilePage;

