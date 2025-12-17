// Component - Company Dashboard
// Main dashboard component combining metrics, hierarchy, and employee list

import React, { useState } from 'react';
import CompanyMetrics from './CompanyMetrics';
import CompanyHierarchy from './CompanyHierarchy';
import EmployeeList from './EmployeeList';
import CompanyAnalyticsDashboard from './CompanyAnalyticsDashboard';
import EnrollmentSection from './EnrollmentSection';
import PendingProfileApprovals from './PendingProfileApprovals';

function CompanyDashboard({ company, departments, teams, employees, hierarchy, metrics, pendingApprovals = [], onEmployeeClick, companyId, isAdminView = false }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'dashboard', 'hierarchy', 'employees', 'enrollment', 'requests', 'approvals'
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="w-full space-y-6">
      {/* Tabs */}
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
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'hierarchy'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={{
            color: activeTab === 'hierarchy' ? 'var(--border-focus)' : 'var(--text-secondary)',
            borderBottomColor: activeTab === 'hierarchy' ? 'var(--border-focus)' : 'transparent'
          }}
        >
          Hierarchy
        </button>
        <button
          onClick={() => {
            // Redirect to Learning Analytics frontend with company_id
            const analyticsUrl = process.env.REACT_APP_LEARNING_ANALYTICS_URL || 'https://learning-analytics-frontend-psi.vercel.app';
            const url = `${analyticsUrl}/?company_id=${encodeURIComponent(companyId)}`;
            console.log('[CompanyDashboard] Redirecting to Learning Analytics:', url);
            window.location.href = url;
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={{
            color: activeTab === 'dashboard' ? 'var(--border-focus)' : 'var(--text-secondary)',
            borderBottomColor: activeTab === 'dashboard' ? 'var(--border-focus)' : 'transparent'
          }}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'employees'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={{
            color: activeTab === 'employees' ? 'var(--border-focus)' : 'var(--text-secondary)',
            borderBottomColor: activeTab === 'employees' ? 'var(--border-focus)' : 'transparent'
          }}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab('enrollment')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'enrollment'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={{
            color: activeTab === 'enrollment' ? 'var(--border-focus)' : 'var(--text-secondary)',
            borderBottomColor: activeTab === 'enrollment' ? 'var(--border-focus)' : 'transparent'
          }}
        >
          Create Career Paths
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'approvals'
              ? 'border-b-2 border-teal-600 text-teal-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          style={{
            color: activeTab === 'approvals' ? 'var(--border-focus)' : 'var(--text-secondary)',
            borderBottomColor: activeTab === 'approvals' ? 'var(--border-focus)' : 'transparent'
          }}
        >
          Profile Approvals
          {pendingApprovals.length > 0 && (
            <span 
              className="ml-2 px-2 py-0.5 text-xs rounded-full text-white"
              style={{ background: 'rgb(239, 68, 68)' }}
            >
              {pendingApprovals.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Company Metrics
              </h3>
              <CompanyMetrics metrics={metrics} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Company Information
              </h3>
              <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Company Name</p>
                    <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                      {company?.company_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Industry</p>
                    <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                      {company?.industry || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Domain</p>
                    <p className="font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                      {company?.domain || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Organizational Hierarchy
            </h3>
            <CompanyHierarchy hierarchy={hierarchy} />
          </div>
        )}

        {/* Analytics tab now redirects - no content shown */}

        {activeTab === 'employees' && (
          <div>
            <EmployeeList 
              employees={employees} 
              onEmployeeClick={onEmployeeClick}
              companyId={companyId}
              departments={departments}
              teams={teams}
              isAdminView={isAdminView}
            />
          </div>
        )}

        {activeTab === 'enrollment' && (
          <div>
            <EnrollmentSection employees={employees} companyId={companyId} />
          </div>
        )}


        {activeTab === 'approvals' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Pending Profile Approvals
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Review and approve enriched employee profiles. Employees can only use the system after their profile is approved.
            </p>
            {isAdminView && (
              <div 
                className="mb-4 p-4 rounded-lg"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgb(59, 130, 246)',
                  color: 'rgb(59, 130, 246)'
                }}
              >
                <p className="text-sm">
                  <strong>Read-only mode:</strong> You are viewing this company profile as an administrator. You cannot approve or reject profiles.
                </p>
              </div>
            )}
            <PendingProfileApprovals
              approvals={pendingApprovals}
              companyId={companyId}
              onApprovalUpdate={() => {
                // Trigger page refresh to reload data
                setRefreshKey(prev => prev + 1);
                window.location.reload();
              }}
              isAdminView={isAdminView}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyDashboard;

