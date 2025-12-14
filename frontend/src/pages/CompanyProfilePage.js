// Page - Company Profile
// Displays company overview with hierarchy, employees, dashboard, and management options

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CompanyDashboard from '../components/CompanyDashboard';
import { getCompanyProfile } from '../services/companyProfileService';

function CompanyProfilePage() {
  const { companyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  
  // Check if this is an admin view (via query param or user role)
  const isAdminView = searchParams.get('admin') === 'true' || 
                     user?.isAdmin || 
                     user?.role === 'DIRECTORY_ADMIN';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // CRITICAL: Verify logged-in user belongs to this company (unless admin)
        if (!isAdminView && user && user.companyId && user.companyId !== companyId) {
          console.error('[CompanyProfilePage] User company mismatch:', {
            userCompanyId: user.companyId,
            requestedCompanyId: companyId,
            userEmail: user.email,
            userFullName: user.fullName
          });
          setError('You do not have access to this company. Please log in with the correct account.');
          setLoading(false);
          return;
        }
        
        console.log('[CompanyProfilePage] Fetching profile for company:', companyId);
        console.log('[CompanyProfilePage] Current user:', {
          email: user?.email,
          fullName: user?.fullName,
          companyId: user?.companyId,
          isHR: user?.isHR
        });
        
        const response = await getCompanyProfile(companyId);
        
        // Debug logging
        console.log('[CompanyProfilePage] Full response:', response);
        
        // Handle response format (could be wrapped in response.response or direct)
        const profileData = response?.response || response;
        
        console.log('[CompanyProfilePage] Profile data:', profileData);
        console.log('[CompanyProfilePage] Company object:', profileData?.company);
        console.log('[CompanyProfilePage] Company logo_url:', profileData?.company?.logo_url);
        
        if (profileData) {
          setProfileData(profileData);
        } else {
          throw new Error('No profile data received');
        }
      } catch (err) {
        console.error('Error fetching company profile:', err);
        setError(
          err.response?.data?.response?.error ||
          err.message ||
          'Failed to load company profile'
        );
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchProfile();
    }
  }, [companyId, user, isAdminView]);

  const handleEmployeeClick = (employee) => {
    // Navigate to employee profile page
    if (isAdminView) {
      navigate(`/employee/${employee.id}?admin=true`);
    } else {
      navigate(`/employee/${employee.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md">
          <div className="p-6 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-800 font-medium mb-2">Error Loading Profile</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-6">
          <div className="flex items-center gap-6 mb-4">
            {/* Debug info - remove after testing */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '10px', color: 'red', position: 'absolute', top: '100px' }}>
                Logo URL: {profileData.company?.logo_url || 'NOT FOUND'}
              </div>
            )}
            {/* Company Logo - Circular */}
            {profileData.company?.logo_url ? (
              <img
                src={profileData.company.logo_url}
                alt={profileData.company.company_name || 'Company Logo'}
                className="company-logo"
                style={{
                  width: 'var(--logo-size, 80px)',
                  height: 'var(--logo-size, 80px)',
                  borderRadius: 'var(--radius-avatar, 9999px)',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  border: '2px solid var(--border-default, #e2e8f0)',
                  boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))',
                  background: 'var(--bg-card, #ffffff)',
                  padding: '4px'
                }}
                onError={(e) => {
                  // Fallback to initial letter if image fails to load
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="company-logo-placeholder"
              style={{
                width: 'var(--logo-size, 80px)',
                height: 'var(--logo-size, 80px)',
                borderRadius: 'var(--radius-avatar, 9999px)',
                display: profileData.company?.logo_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--gradient-primary, linear-gradient(135deg, #065f46, #047857))',
                color: 'var(--text-inverse, #ffffff)',
                fontSize: 'var(--logo-font-size, 32px)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))',
                border: '2px solid var(--border-default, #e2e8f0)'
              }}
            >
              {(profileData.company?.company_name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 
                className="text-3xl font-bold mb-2" 
                style={{ 
                  color: 'var(--text-primary, #1e293b)',
                  fontSize: 'var(--font-size-3xl, 30px)',
                  fontWeight: 'var(--font-weight-bold, 700)'
                }}
              >
                {profileData.company?.company_name || 'Company Profile'}
              </h1>
              <p 
                className="text-lg" 
                style={{ 
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: 'var(--font-size-lg, 18px)'
                }}
              >
                Company Overview & Management Dashboard
              </p>
              {profileData.company?.industry && (
                <p 
                  className="text-sm mt-1" 
                  style={{ 
                    color: 'var(--text-muted, #94a3b8)',
                    fontSize: 'var(--font-size-sm, 14px)'
                  }}
                >
                  {profileData.company.industry}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <CompanyDashboard
          company={profileData.company}
          departments={profileData.departments}
          teams={profileData.teams}
          employees={profileData.employees}
          hierarchy={profileData.hierarchy}
          metrics={profileData.metrics}
          pendingApprovals={profileData.pending_approvals || []}
          onEmployeeClick={handleEmployeeClick}
          companyId={companyId}
          isAdminView={isAdminView}
        />
      </div>
    </div>
  );
}

export default CompanyProfilePage;

