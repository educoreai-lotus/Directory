// Page - Company Profile
// Displays company overview with hierarchy, employees, dashboard, and management options

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CompanyDashboard from '../components/CompanyDashboard';
import { getCompanyProfile } from '../services/companyProfileService';

function CompanyProfilePage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getCompanyProfile(companyId);
        
        if (response && response.response) {
          setProfileData(response.response);
        } else {
          setProfileData(response);
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
  }, [companyId]);

  const handleEmployeeClick = (employee) => {
    // Navigate to employee profile page (F010 - will be fully implemented after profile enrichment)
    console.log('Navigate to employee profile:', employee.id);
    // For now, just log - will navigate when employee profile page is ready
    // navigate(`/employee/${employee.id}`);
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {profileData.company?.company_name || 'Company Profile'}
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Company Overview & Management Dashboard
          </p>
        </div>

        {/* Dashboard */}
        <CompanyDashboard
          company={profileData.company}
          departments={profileData.departments}
          teams={profileData.teams}
          employees={profileData.employees}
          hierarchy={profileData.hierarchy}
          metrics={profileData.metrics}
          onEmployeeClick={handleEmployeeClick}
          companyId={companyId}
        />
      </div>
    </div>
  );
}

export default CompanyProfilePage;

