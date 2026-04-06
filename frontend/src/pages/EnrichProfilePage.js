// Frontend Page - Enrich Profile Page
// Shown on first login to connect LinkedIn and GitHub

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LinkedInConnectButton from '../components/LinkedInConnectButton';
import GitHubConnectButton from '../components/GitHubConnectButton';
// PHASE_4: Import new components for extended enrichment flow
import UploadCVSection from '../components/UploadCVSection';
import ManualProfileForm from '../components/ManualProfileForm';
import { triggerEnrichment, getEnrichmentStatus, saveManualData } from '../services/enrichmentService';
import { getAccessToken } from '../auth/accessTokenStore';
import { redirectToNAuthLogin } from '../utils/nauthRedirect';

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
  const sessionRecoverRef = useRef(false);

  useEffect(() => {
    if (user) {
      sessionRecoverRef.current = false;
    }
  }, [user]);

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

  // OAuth return: backend redirects with ?linkedin=connected or ?github=connected only (no token in URL).
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      if (
        decodedError.includes('unauthorized_scope_error') ||
        decodedError.includes('LinkedIn app does not have required permissions')
      ) {
        setError(
          'LinkedIn connection failed: The LinkedIn app does not have the required permissions. Please check the LinkedIn Developer Portal settings. See the documentation for setup instructions.'
        );
      } else {
        setError(decodedError);
      }
      setSuccessMessage(null);
      const nu = new URL(window.location.href);
      nu.searchParams.delete('error');
      window.history.replaceState({}, document.title, nu.pathname + nu.search);
      return;
    }

    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    if (linkedinParam !== 'connected' && githubParam !== 'connected') {
      return;
    }

    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const u = await refreshUser();
        if (cancelled) return;
        if (u) {
          setLinkedinConnected(!!u.hasLinkedIn);
          setGithubConnected(!!u.hasGitHub);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          const nu = new URL(window.location.href);
          nu.searchParams.delete('linkedin');
          nu.searchParams.delete('github');
          nu.searchParams.delete('enriched');
          window.history.replaceState({}, document.title, nu.pathname + nu.search);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
    }
    // Removed old "Both LinkedIn and GitHub connected" message - no longer needed
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
    
    // REMOVED: Don't redirect if OAuth is connected but enrichment not complete
    // User should be able to access enrich page to complete the process
    // The old logic was too aggressive and prevented users from continuing enrichment
  }, [user, navigate, linkedinConnected, githubConnected, searchParams]);

  // Unauthenticated visitors → nAuth login (same-tab sessionStorage keeps JWT across OAuth redirects)
  useEffect(() => {
    if (authLoading || refreshing) return;
    if (user) return;
    const linkedinParam = searchParams.get('linkedin');
    const githubParam = searchParams.get('github');
    if (linkedinParam === 'connected' || githubParam === 'connected') {
      return;
    }
    if (!getAccessToken()) {
      redirectToNAuthLogin();
      return;
    }
    if (sessionRecoverRef.current) {
      redirectToNAuthLogin();
      return;
    }
    sessionRecoverRef.current = true;
    refreshUser().then((u) => {
      if (!u) {
        redirectToNAuthLogin();
      }
    });
  }, [authLoading, user, refreshing, refreshUser, searchParams]);

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
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting to sign in...</p>
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

    // CRITICAL VALIDATION LOGIC:
    // Case 1: User HAS GitHub OR CV → Manual form is optional (can be empty)
    // Case 2: User has NO GitHub AND NO CV → Manual form is mandatory
    if (!hasRealDataSource && isManualFormEmpty) {
      setError('Please fill at least one field');
      return;
    }

    try {
      setEnriching(true);
      setError(null);
      setSuccessMessage('Enriching your profile... This may take a moment.');

      // CRITICAL: Save manual form data before enrichment
      // Case 1: If user has GitHub/CV, empty form is OK (no-op)
      // Case 2: If user has no GitHub/CV, form must have data (already validated above)
      // Always try to save (backend will handle empty form correctly based on GitHub/CV status)
      const formDataToSave = {
        skills: (manualFormData?.skills && typeof manualFormData.skills === 'string') ? manualFormData.skills : '',
        education: (manualFormData?.education && typeof manualFormData.education === 'string') ? manualFormData.education : '',
        work_experience: (manualFormData?.work_experience && typeof manualFormData.work_experience === 'string') ? manualFormData.work_experience : ''
      };

      console.log('Sending manual data:', formDataToSave);
      
      try {
        await saveManualData(user.id, formDataToSave);
        // Only set manualDataSaved if form actually has data
        if (!isManualFormEmpty) {
          setManualDataSaved(true);
        }
      } catch (saveError) {
        // If save fails and user has GitHub/CV, it might be a no-op (empty form) - that's OK
        // If save fails and user has no GitHub/CV, error should have been caught by validation above
        if (!hasRealDataSource) {
          // User has no GitHub/CV, so save failure is a real error
          throw saveError;
        }
        // Otherwise, continue (empty form with GitHub/CV is valid)
        console.log('[EnrichProfilePage] Manual form save skipped (empty form with GitHub/CV)');
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0077b5' }}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <div>
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  LinkedIn
                </h3>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Connect your LinkedIn account to import your professional profile and experience
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <LinkedInConnectButton 
              disabled={linkedinConnected}
              onConnected={() => setLinkedinConnected(true)}
              alreadyConnected={linkedinConnected}
            />
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
          <span 
            className="px-4 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            OR
          </span>
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#24292e' }}>
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              <div>
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  GitHub
                </h3>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Connect your GitHub account to showcase your projects and code contributions
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <GitHubConnectButton 
              disabled={githubConnected}
              onConnected={() => {
                setGithubConnected(true);
                setSuccessMessage('✓ GitHub connected successfully!');
              }}
              alreadyConnected={githubConnected}
            />
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
          <span 
            className="px-4 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            OR
          </span>
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Upload Your CV (PDF)
                </h3>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Upload your CV as a PDF file to extract your professional information
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <UploadCVSection 
              employeeId={user?.id}
              onUploaded={(result) => {
                setPdfUploaded(true);
              }}
            />
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
          <span 
            className="px-4 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            OR
          </span>
          <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Manual Details
                </h3>
                <p 
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Fill in your work experience, skills, and education manually
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <ManualProfileForm 
              employeeId={user?.id}
              isRequired={!githubConnected && !pdfUploaded}
              onSaved={(result) => {
                setManualDataSaved(true);
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
        </div>

        {/* Continue Button */}
        {/* CRITICAL: LinkedIn is NOT a valid enrichment source - only GitHub, CV, or Manual form count */}
        {/* Show button if user has GitHub OR CV OR manual form filled */}
        {(githubConnected || pdfUploaded || manualDataSaved) && (
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
              Your profile will be enriched with AI-generated content using the data you provided.
            </p>
          </div>
        )}
        
        {/* Show message if no valid sources connected yet */}
        {/* LinkedIn alone is NOT sufficient - need GitHub, CV, or Manual form */}
        {!githubConnected && !pdfUploaded && !manualDataSaved && (
          <div className="mt-8">
            <p 
              className="text-sm text-center mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Please connect GitHub, upload CV, or fill the manual form to continue.
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

