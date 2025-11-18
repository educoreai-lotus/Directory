// Frontend Page - Employee Profile Page
// Displays employee profile with enriched bio and project summaries

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployee } from '../services/employeeService';

function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get employee data
        const response = await getEmployee(user?.companyId, employeeId);
        
        // Handle response format
        const employeeData = response?.response?.employee || response?.employee || response;
        
        if (!employeeData) {
          throw new Error('Employee data not found');
        }

        setEmployee(employeeData);
      } catch (err) {
        console.error('Error fetching employee profile:', err);
        setError(
          err.response?.data?.response?.error ||
          err.message ||
          'Failed to load employee profile'
        );
      } finally {
        setLoading(false);
      }
    };

    if (employeeId && user?.companyId) {
      fetchEmployee();
    }
  }, [employeeId, user?.companyId]);

  // Parse project summaries if stored as JSON string
  const parseProjectSummaries = (summaries) => {
    if (!summaries) return [];
    if (typeof summaries === 'string') {
      try {
        return JSON.parse(summaries);
      } catch (e) {
        console.warn('Failed to parse project summaries:', e);
        return [];
      }
    }
    return Array.isArray(summaries) ? summaries : [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading profile...</p>
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

  if (!employee) {
    return null;
  }

  const projectSummaries = parseProjectSummaries(employee.project_summaries);
  const enrichmentComplete = employee.enrichment_completed || false;
  const enrichmentStatus = searchParams.get('enrichment');

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        {enrichmentStatus === 'complete' && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm">✓ Profile enrichment completed successfully!</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-teal-600 hover:text-teal-700"
          >
            ← Back
          </button>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {employee.full_name || 'Employee Profile'}
          </h1>
          <p 
            className="text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {employee.current_role_in_company || 'Employee'}
          </p>
        </div>

        {/* Profile Card */}
        <div 
          className="rounded-lg shadow-lg border p-8 mb-6"
          style={{
            background: 'var(--gradient-card)',
            borderRadius: 'var(--radius-card, 8px)',
            boxShadow: 'var(--shadow-card)',
            borderColor: 'var(--border-default)'
          }}
        >
          {/* Basic Information */}
          <div className="mb-6">
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Employee ID</p>
                <p style={{ color: 'var(--text-primary)' }}>{employee.employee_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Email</p>
                <p style={{ color: 'var(--text-primary)' }}>{employee.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Department</p>
                <p style={{ color: 'var(--text-primary)' }}>{employee.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Team</p>
                <p style={{ color: 'var(--text-primary)' }}>{employee.team || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* LinkedIn & GitHub Links */}
          {(employee.linkedin_url || employee.github_url) && (
            <div className="mb-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Professional Links
              </h2>
              <div className="flex gap-4">
                {employee.linkedin_url && (
                  <a
                    href={employee.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    LinkedIn Profile
                  </a>
                )}
                {employee.github_url && (
                  <a
                    href={employee.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    GitHub Profile
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI-Generated Bio */}
          {employee.bio && (
            <div className="mb-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Professional Bio
                {enrichmentComplete && (
                  <span 
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: 'rgb(34, 197, 94)'
                    }}
                  >
                    AI-Enriched
                  </span>
                )}
              </h2>
              <p 
                className="leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {employee.bio}
              </p>
            </div>
          )}

          {/* Project Summaries */}
          {projectSummaries.length > 0 && (
            <div className="mb-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Projects & Contributions
                {enrichmentComplete && (
                  <span 
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: 'rgb(34, 197, 94)'
                    }}
                  >
                    AI-Enriched
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {projectSummaries.map((project, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 
                        className="font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {project.repository_name || 'Project'}
                      </h3>
                      {project.repository_url && (
                        <a
                          href={project.repository_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          View on GitHub →
                        </a>
                      )}
                    </div>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {project.summary || 'No description available.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrichment Status */}
          {!enrichmentComplete && (!employee.bio || projectSummaries.length === 0) && (
            <div 
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgb(251, 191, 36)',
                color: 'rgb(251, 191, 36)'
              }}
            >
              <p className="text-sm">
                Profile enrichment is in progress. Bio and project summaries will appear here once enrichment is complete.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeProfilePage;

