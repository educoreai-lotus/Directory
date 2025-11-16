import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VerificationStatus from '../components/VerificationStatus';
import { getCompanyVerificationStatus } from '../services/companyVerificationService';

function CompanyVerificationPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!companyId) {
      navigate('/register');
      return;
    }

    fetchVerificationStatus();
  }, [companyId, navigate]);

  useEffect(() => {
    // Poll for status updates if status is pending
    if (verificationData?.verification_status === 'pending' && !polling) {
      console.log('[VerificationPage] Starting polling for status updates');
      setPolling(true);
      const interval = setInterval(() => {
        console.log('[VerificationPage] Polling for status update...');
        fetchVerificationStatus();
      }, 3000); // Poll every 3 seconds (more frequent)

      return () => {
        console.log('[VerificationPage] Stopping polling');
        clearInterval(interval);
        setPolling(false);
      };
    }

    // Auto-redirect when approved
    if (verificationData?.verification_status === 'approved') {
      console.log('[VerificationPage] Status is approved, scheduling redirect');
      const timer = setTimeout(() => {
        console.log('[VerificationPage] Redirecting to CSV upload page');
        navigate(`/upload/${companyId}`);
      }, 5000); // Redirect after 5 seconds (give user time to see success message)

      return () => clearTimeout(timer);
    }
  }, [verificationData, navigate, companyId, polling]);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await getCompanyVerificationStatus(companyId);
      
      console.log('[VerificationPage] Received status response:', response);
      
      if (response && response.response) {
        const statusData = response.response;
        console.log('[VerificationPage] Status data:', statusData);
        console.log('[VerificationPage] Verification status:', statusData.verification_status);
        
        setVerificationData(statusData);
        setError(null);
        
        // If status changed to approved, stop polling immediately
        if (statusData.verification_status === 'approved') {
          setPolling(false);
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
  };

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

            {verificationData.verification_status === 'pending' && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-2 rounded-full animate-pulse"
                      style={{
                        width: '60%',
                        background: 'var(--border-warning)'
                      }}
                    ></div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Checking...
                  </span>
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                  This page will automatically update when verification is complete.
                </p>
              </div>
            )}

            {verificationData.verification_status === 'approved' && (
              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your company has been verified successfully! Redirecting to CSV upload page...
                </p>
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

