import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VerificationStatus from '../components/VerificationStatus';
import { getCompanyVerificationStatus } from '../services/companyVerificationService';

function CompanyVerificationPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressStage, setProgressStage] = useState(0); // 0: initial, 1: format check, 2: DNS check, 3: MX check, 4: complete
  const pollingIntervalRef = useRef(null);
  const redirectTimerRef = useRef(null);

  // Memoized fetch function to prevent stale closures
  const fetchVerificationStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCompanyVerificationStatus(companyId);
      
      console.log('[VerificationPage] Received status response:', response);
      
      if (response && response.response) {
        const statusData = response.response;
        console.log('[VerificationPage] Status data:', statusData);
        console.log('[VerificationPage] Verification status:', statusData.verification_status);
        
        // Update verification data
        const previousStatus = verificationData?.verification_status;
        setVerificationData(statusData);
        setError(null);
        
        // Update progress based on status
        if (statusData.verification_status === 'approved') {
          setProgressStage(4); // Complete
          // Stop polling immediately
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (statusData.verification_status === 'pending') {
          // Animate progress stages while pending
          if (progressStage < 3) {
            setProgressStage(prev => Math.min(prev + 1, 3));
          }
        }
        
        // If status changed from pending to approved, trigger immediate UI update
        if (previousStatus === 'pending' && statusData.verification_status === 'approved') {
          console.log('[VerificationPage] Status changed from pending to approved!');
        }
      } else if (response && response.verification_status) {
        // Handle case where response is not wrapped (shouldn't happen but just in case)
        console.log('[VerificationPage] Direct status response:', response);
        setVerificationData(response);
        setError(null);
      } else {
        console.error('[VerificationPage] Invalid response format:', response);
        setError('Failed to fetch verification status');
      }
    } catch (err) {
      console.error('[VerificationPage] Verification status error:', err);
      setError(err.response?.data?.response?.error || 'An error occurred while checking verification status');
    } finally {
      setLoading(false);
    }
  }, [companyId, verificationData?.verification_status, progressStage]);

  // Initial fetch on mount
  useEffect(() => {
    if (!companyId) {
      navigate('/register');
      return;
    }

    // Initial fetch
    fetchVerificationStatus();
  }, [companyId, navigate, fetchVerificationStatus]);

  // Progress animation - runs independently
  useEffect(() => {
    if (!verificationData || verificationData.verification_status !== 'pending') {
      return;
    }

    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgressStage(prev => {
        if (prev < 3) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000); // Update progress every 2 seconds

    return () => {
      clearInterval(progressInterval);
    };
  }, [verificationData]);

  // Set up polling and redirect logic
  useEffect(() => {
    if (!verificationData) {
      return;
    }

    const status = verificationData.verification_status;

    // Auto-redirect when approved
    if (status === 'approved') {
      console.log('[VerificationPage] Status is approved, scheduling redirect');
      
      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Set up redirect timer
      redirectTimerRef.current = setTimeout(() => {
        console.log('[VerificationPage] Redirecting to CSV upload page');
        navigate(`/upload/${companyId}`);
      }, 5000);

      return () => {
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current);
        }
      };
    }

    // Poll for status updates if status is pending
    if (status === 'pending' && !pollingIntervalRef.current) {
      console.log('[VerificationPage] Starting polling for status updates');
      
      pollingIntervalRef.current = setInterval(() => {
        console.log('[VerificationPage] Polling for status update...');
        fetchVerificationStatus();
      }, 2000); // Poll every 2 seconds (more frequent for better UX)
    }

    // Cleanup polling on unmount or status change
    return () => {
      if (pollingIntervalRef.current && status !== 'pending') {
        console.log('[VerificationPage] Stopping polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [verificationData, navigate, companyId, fetchVerificationStatus]);

  const handleRetry = () => {
    fetchVerificationStatus();
  };

  if (loading && !verificationData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{
          background: 'var(--bg-body, var(--bg-primary))',
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--border-focus)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading verification status...</p>
        </div>
      </div>
    );
  }

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
            Company Verification
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            We're verifying your company registration
          </p>
        </div>

        {error && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-error)',
              color: 'var(--border-error)'
            }}
          >
            {error}
            <button
              onClick={handleRetry}
              className="ml-4 underline"
            >
              Retry
            </button>
          </div>
        )}

        {verificationData && (
          <>
            <VerificationStatus
              status={verificationData.verification_status}
              companyName={verificationData.company_name}
              domain={verificationData.domain}
            />

            {/* Seamless transition - single page with dynamic content */}
            {verificationData.verification_status === 'pending' && (
              <div className="mt-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      Verification Progress
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {Math.round((progressStage / 4) * 100)}%
                    </span>
                  </div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-3 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(progressStage / 4) * 100}%`,
                        background: progressStage < 4 
                          ? 'linear-gradient(90deg, var(--border-warning), var(--border-focus))'
                          : 'var(--border-success)',
                        boxShadow: progressStage < 4 
                          ? '0 0 10px rgba(245, 158, 11, 0.3)'
                          : '0 0 10px rgba(16, 185, 129, 0.3)'
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${progressStage >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <span>{progressStage >= 1 ? '✓' : '○'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Validating domain format...</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${progressStage >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                    <span>{progressStage >= 2 ? '✓' : '○'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Checking DNS records...</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${progressStage >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                    <span>{progressStage >= 3 ? '✓' : '○'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Verifying mail server...</span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${progressStage >= 4 ? 'opacity-100' : 'opacity-50'}`}>
                    <span>{progressStage >= 4 ? '✓' : '○'}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Finalizing verification...</span>
                  </div>
                </div>
                
                <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  This page will automatically update when verification is complete.
                </p>
              </div>
            )}

            {verificationData.verification_status === 'approved' && (
              <div className="mt-6 animate-fade-in">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      Verification Complete
                    </span>
                    <span className="text-xs" style={{ color: 'var(--border-success)' }}>
                      100%
                    </span>
                  </div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-3 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: '100%',
                        background: 'var(--border-success)',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs opacity-100">
                    <span>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Domain format validated</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-100">
                    <span>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>DNS records verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-100">
                    <span>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Mail server confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-100">
                    <span>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Verification approved</span>
                  </div>
                </div>
                
                <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--border-success)' }}>
                    ✓ Company Verified Successfully!
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Redirecting to CSV upload page in a few seconds...
                  </p>
                </div>
              </div>
            )}

            {verificationData.verification_status === 'rejected' && (
              <div className="mt-6">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  If you believe this is an error, please contact support with your company ID: <strong>{companyId}</strong>
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="btn btn-secondary w-full"
                >
                  Return to Registration
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CompanyVerificationPage;

