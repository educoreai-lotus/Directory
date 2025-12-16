// Frontend Page - Admin Dashboard
// Platform-level admin dashboard for managing the entire directory

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { getAllCompanies } from '../services/adminService';

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[AdminDashboard] Fetching companies...');
        const response = await getAllCompanies();
        console.log('[AdminDashboard] Response:', response);
        const companiesData = response?.response?.companies || response?.companies || [];
        console.log('[AdminDashboard] Companies data:', companiesData);
        console.log('[AdminDashboard] Companies count:', companiesData.length);
        setCompanies(companiesData);
      } catch (err) {
        console.error('[AdminDashboard] Error fetching companies:', err);
        console.error('[AdminDashboard] Error details:', err.response?.data || err.message);
        setError('Failed to load companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleViewCompany = (companyId) => {
    navigate(`/company/${companyId}?admin=true`);
  };

  const handleManagementReporting = () => {
    // Redirect to Management & Reporting frontend with admin ID
    const baseUrl = process.env.REACT_APP_MANAGEMENT_REPORTING_URL || 'https://management-reporting.vercel.app/dashboard';
    const adminId = user?.id; // Admin UUID from database
    
    if (!adminId) {
      console.error('[AdminDashboard] Cannot redirect: Admin ID is missing');
      alert('Error: Admin ID not found. Please log in again.');
      return;
    }
    
    // Build URL with admin ID as query parameter
    const mgmtUrl = `${baseUrl}?adminId=${encodeURIComponent(adminId)}`;
    
    console.log('[AdminDashboard] Redirecting to Management & Reporting:', mgmtUrl);
    console.log('[AdminDashboard] Admin ID (UUID):', adminId);
    window.location.href = mgmtUrl;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', border: 'rgb(34, 197, 94)' };
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.1)', text: 'rgb(251, 191, 36)', border: 'rgb(251, 191, 36)' };
      case 'rejected':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)', border: 'rgb(239, 68, 68)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', text: 'rgb(148, 163, 184)', border: 'rgb(148, 163, 184)' };
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Admin Name - Matching Company Profile Style */}
        <div className="mb-6">
          <div className="flex items-center gap-6 mb-4">
            {/* Admin Avatar - Circular */}
            <div
              className="admin-avatar-placeholder"
              style={{
                width: 'var(--logo-size, 80px)',
                height: 'var(--logo-size, 80px)',
                borderRadius: 'var(--radius-avatar, 9999px)',
                display: 'flex',
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
              {(user?.fullName || 'A').charAt(0).toUpperCase()}
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
                {user?.fullName || 'Directory Admin'}
              </h1>
              <p 
                className="text-lg" 
                style={{ 
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: 'var(--font-size-lg, 18px)'
                }}
              >
                Directory Overview & Management Dashboard
              </p>
              <p 
                className="text-sm mt-1" 
                style={{ 
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: 'var(--font-size-sm, 14px)'
                }}
              >
                Platform Administrator
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="w-full space-y-6">
          {/* Tabs - Matching Company Dashboard Style */}
          <div className="flex space-x-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{
                color: activeTab === 'overview' ? 'var(--border-focus)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'overview' ? 'var(--border-focus)' : 'transparent'
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{
                color: activeTab === 'requests' ? 'var(--border-focus)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'requests' ? 'var(--border-focus)' : 'transparent'
              }}
            >
              Requests
            </button>
            <button
              onClick={handleManagementReporting}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'management'
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{
                color: activeTab === 'management' ? 'var(--border-focus)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'management' ? 'var(--border-focus)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              Management & Reporting
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>

            {/* Companies Grid */}
            {loading ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>Loading companies...</p>
              </div>
            ) : error ? (
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgb(239, 68, 68)',
                  color: 'rgb(239, 68, 68)'
                }}
              >
                <p>{error}</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>No companies registered yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => {
                  const statusStyle = getStatusColor(company.status);
                  return (
                    <div
                      key={company.id}
                      onClick={() => handleViewCompany(company.id)}
                      className="p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-all"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-default)',
                        boxShadow: 'var(--shadow-card)'
                      }}
                    >
                      <div className="flex items-start gap-4 mb-3">
                        {/* Company Logo */}
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.company_name || 'Company Logo'}
                            className="company-logo"
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '9999px',
                              objectFit: 'contain',
                              objectPosition: 'center',
                              border: '2px solid var(--border-default, #e2e8f0)',
                              boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))',
                              background: 'var(--bg-card, #ffffff)',
                              flexShrink: 0,
                              padding: '4px'
                            }}
                            onError={(e) => {
                              // Hide image on error, show placeholder
                              e.target.style.display = 'none';
                              const fallback = e.target.nextSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="company-logo-placeholder"
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '9999px',
                            display: company.logo_url ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--gradient-primary, linear-gradient(135deg, #065f46, #047857))',
                            color: 'var(--text-inverse, #ffffff)',
                            fontSize: '24px',
                            fontWeight: 'var(--font-weight-semibold, 600)',
                            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))',
                            border: '2px solid var(--border-default, #e2e8f0)',
                            flexShrink: 0
                          }}
                        >
                          {(company.company_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 
                              className="text-lg font-semibold flex-1"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {company.company_name}
                            </h3>
                            <span
                              className="px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0"
                              style={{
                                background: statusStyle.bg,
                                border: `1px solid ${statusStyle.border}`,
                                color: statusStyle.text
                              }}
                            >
                              {company.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {company.industry && (
                        <p 
                          className="text-sm mb-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {company.industry}
                        </p>
                      )}
                      
                      {company.domain && (
                        <p 
                          className="text-xs mb-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {company.domain}
                        </p>
                      )}
                      
                      {company.created_date && (
                        <p 
                          className="text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Created: {new Date(company.created_date).toLocaleDateString()}
                        </p>
                      )}
                      
                      <div className="mt-4">
                        <button
                          className="text-sm text-teal-600 hover:text-teal-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCompany(company.id);
                          }}
                        >
                          View Company Profile →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              <div 
                className="p-6 rounded-lg border text-center"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <p style={{ color: 'var(--text-secondary)' }}>
                  Pending requests feature coming soon. This will show requests from companies for critical changes (e.g., domain changes).
                </p>
              </div>
            </div>
          )}

          {/* Management & Reporting Tab */}
          {activeTab === 'management' && (
            <div>
              <div 
                className="p-6 rounded-lg border text-center"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <p style={{ color: 'var(--text-secondary)' }}>
                  Management & Reporting microservice integration coming soon.{' '}
                  <button
                    onClick={handleManagementReporting}
                    className="text-teal-600 hover:text-teal-700 underline font-medium"
                    style={{
                      color: 'var(--border-focus)'
                    }}
                  >
                    View System Analytics
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

