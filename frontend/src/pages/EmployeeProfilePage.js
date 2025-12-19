// Frontend Page - Employee Profile Page
// Displays employee profile with enriched bio and project summaries

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployee } from '../services/employeeService';
import TrainerSettings from '../components/TrainerSettings';
import ApprovedProfileTabs from '../components/ApprovedProfileTabs';
import LearningPathApprovals from '../components/LearningPathApprovals';
import ProfileEditForm from '../components/ProfileEditForm';
import ProfileManagement from '../components/ProfileManagement';

function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEnrichmentSuccess, setShowEnrichmentSuccess] = useState(true);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(true);

  // Determine if this is an admin view (must be defined before useEffect)
  const isAdminView = searchParams.get('admin') === 'true' || 
                     user?.isAdmin || 
                     user?.role === 'DIRECTORY_ADMIN';

  // Auto-dismiss success messages after 5 seconds
  // Use employee data if available, otherwise use defaults
  useEffect(() => {
    const enrichmentComplete = employee?.enrichment_completed || false;
    if (enrichmentComplete && showEnrichmentSuccess) {
      const timer = setTimeout(() => {
        setShowEnrichmentSuccess(false);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [employee?.enrichment_completed, showEnrichmentSuccess]);

  useEffect(() => {
    const profileStatus = employee?.profile_status || 'basic';
    if (profileStatus === 'approved' && showApprovalSuccess) {
      const timer = setTimeout(() => {
        setShowApprovalSuccess(false);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [employee?.profile_status, showApprovalSuccess]);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get employee data - allow companyId to be null for admin view
        const response = await getEmployee(user?.companyId || null, employeeId);
        
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

    if (employeeId && (user?.companyId || isAdminView)) {
      fetchEmployee();
    }
  }, [employeeId, user?.companyId, isAdminView]);

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
  const profileStatus = employee.profile_status || 'basic';
  const enrichmentStatus = searchParams.get('enrichment');

  // Debug: Log roles and profile status for Management section
  const isManager = employee.roles && 
                   Array.isArray(employee.roles) && 
                   (employee.roles.includes('DEPARTMENT_MANAGER') || employee.roles.includes('TEAM_MANAGER'));
  const isApproved = profileStatus === 'approved';
  
  // Determine if current user is viewing their own profile or someone else's
  const isOwnProfile = user?.id === employeeId && !isAdminView;
  const isViewOnly = !isOwnProfile || isAdminView; // Read-only mode when viewing someone else's profile or when admin
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[EmployeeProfilePage] Section Visibility Debug:', {
      employeeName: employee.full_name,
      profileStatus,
      isApproved,
      roles: employee.roles,
      isManager,
      isTrainer: employee.is_trainer,
      isDecisionMaker: employee.roles && Array.isArray(employee.roles) && employee.roles.includes('DECISION_MAKER'),
      willShowManagement: isApproved && isManager,
      willShowTrainer: employee.is_trainer,
      willShowLearningPaths: employee.roles && Array.isArray(employee.roles) && employee.roles.includes('DECISION_MAKER'),
      isOwnProfile,
      isViewOnly
    });
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* PHASE_4: Banner if enrichment not completed */}
        {!enrichmentComplete && isOwnProfile && (
          <div 
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgb(251, 191, 36)',
              color: 'rgb(251, 191, 36)'
            }}
          >
            <div>
              <p className="text-sm font-medium mb-1">Your profile is not enriched yet</p>
              <p className="text-xs">Enrich your profile to unlock AI-generated content and better visibility.</p>
            </div>
            <button
              onClick={() => navigate('/enrich')}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-sm"
            >
              Enrich Profile
            </button>
          </div>
        )}

        {/* Enrichment Success Message - Auto-dismiss after 5 seconds */}
        {enrichmentComplete && showEnrichmentSuccess && (
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

        {/* Profile Status Messages */}
        {profileStatus === 'enriched' && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgb(251, 191, 36)',
              color: 'rgb(251, 191, 36)'
            }}
          >
            <p className="text-sm font-medium mb-1">⏳ Waiting for HR Approval</p>
            <p className="text-sm">
              Your profile has been enriched and is pending HR review. You will be able to use the system once your profile is approved.
            </p>
          </div>
        )}

        {profileStatus === 'rejected' && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-error)',
              color: 'var(--text-error)'
            }}
          >
            <p className="text-sm font-medium mb-1">❌ Profile Rejected</p>
            <p className="text-sm">
              Your enriched profile has been rejected by HR. Please contact HR for more information.
            </p>
          </div>
        )}

        {/* Profile Approved Message - Auto-dismiss after 5 seconds */}
        {profileStatus === 'approved' && showApprovalSuccess && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgb(34, 197, 94)',
              color: 'rgb(34, 197, 94)'
            }}
          >
            <p className="text-sm font-medium">✓ Profile Approved</p>
            <p className="text-sm">
              Your profile has been approved by HR. You can now use all system features.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          {/* Profile Photo and Name */}
          <div className="flex items-center gap-6 mb-6">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={employee.full_name || 'Profile'}
                className="w-24 h-24 rounded-full object-cover border-2"
                style={{
                  borderColor: 'var(--border-default, #e2e8f0)',
                  boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))'
                }}
                onError={(e) => {
                  // Fallback to avatar initial if image fails to load
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-semibold text-white ${
                employee.profile_photo_url ? 'hidden' : ''
              }`}
              style={{
                background: 'var(--gradient-primary, linear-gradient(135deg, #065f46, #047857))',
                boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))'
              }}
            >
              {(employee.full_name || employee.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ color: 'var(--text-primary, #1e293b)' }}
              >
                {employee.full_name || employee.email || 'Employee'}
              </h1>
              {employee.current_role_in_company && (
                <p 
                  className="text-lg"
                  style={{ color: 'var(--text-secondary, #64748b)' }}
                >
                  {employee.current_role_in_company}
                </p>
              )}
              {employee.email && (
                <p 
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-muted, #94a3b8)' }}
                >
                  {employee.email}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              ← Back
            </button>
            {/* Only show Edit button if viewing own profile */}
            {user?.id === employeeId && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  background: isEditing ? 'var(--bg-button-secondary)' : 'var(--bg-button-primary)',
                  color: isEditing ? 'var(--text-button-secondary)' : 'var(--text-button-primary)'
                }}
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            )}
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && user?.id === employeeId && (
          <ProfileEditForm
            employee={employee}
            onSave={() => {
              setIsEditing(false);
              // Refresh employee data
              const fetchEmployee = async () => {
                try {
                  const response = await getEmployee(user?.companyId, employeeId);
                  const employeeData = response?.response?.employee || response?.employee || response;
                  if (employeeData) {
                    setEmployee(employeeData);
                  }
                } catch (err) {
                  console.error('Error refreshing employee:', err);
                }
              };
              fetchEmployee();
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {/* Profile Card - Only show when not editing */}
        {!isEditing && (
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

          {/* Value Proposition Section */}
          {employee.value_proposition && (
            <div className="mb-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Value Proposition
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
              <div 
                className="leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {/* Format value proposition with READ MORE at the end of sentences */}
                {(() => {
                  const valueProp = employee.value_proposition;
                  const firstName = employee.full_name?.split(' ')[0] || 'they';
                  const pronoun = firstName.toLowerCase() === 'they' ? 'their' : firstName.toLowerCase().endsWith('s') ? 'their' : 'his';
                  
                  // Split by sentences
                  const sentences = valueProp.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
                  
                  if (sentences.length > 0) {
                    // Display all sentences without READ MORE
                    return (
                      <>
                        {sentences.map((sentence, idx) => (
                          <p key={idx} className={idx < sentences.length - 1 ? 'mb-2' : 'mb-2'}>
                            {sentence.trim()}
                          </p>
                        ))}
                      </>
                    );
                  }
                  
                  // Fallback: Just display the value proposition
                  return (
                    <p>
                      {valueProp.trim()}
                    </p>
                  );
                })()}
              </div>
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

        </div>
        )}

        {/* Approved Employee Features - Only visible when profile is approved */}
        {profileStatus === 'approved' && (
          <div 
            className="rounded-lg shadow-lg border p-8 mb-6"
            style={{
              background: 'var(--gradient-card)',
              borderRadius: 'var(--radius-card, 8px)',
              boxShadow: 'var(--shadow-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            <h2 
              className="text-2xl font-semibold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Learning & Development
            </h2>

            {/* Tabs for organizing sections */}
            <ApprovedProfileTabs 
              employeeId={employeeId} 
              user={user} 
              employee={employee}
              isViewOnly={isViewOnly}
            />
          </div>
        )}

        {/* Learning Path Approvals - Only visible for Decision Makers when profile is approved */}
        {isApproved && employee.roles && Array.isArray(employee.roles) && employee.roles.includes('DECISION_MAKER') && (
          <div 
            className="rounded-lg shadow-lg border p-8 mb-6"
            style={{
              background: 'var(--gradient-card)',
              borderRadius: 'var(--radius-card, 8px)',
              boxShadow: 'var(--shadow-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            <h2 
              className="text-2xl font-semibold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Learning Paths Approvals
            </h2>
            <LearningPathApprovals 
              employeeId={employeeId}
              companyId={user?.companyId}
            />
          </div>
        )}

        {/* Trainer Sections - Only visible for trainers when profile is approved */}
        {isApproved && employee.is_trainer && (
          <div 
            className="rounded-lg shadow-lg border p-8 mb-6"
            style={{
              background: 'var(--gradient-card)',
              borderRadius: 'var(--radius-card, 8px)',
              boxShadow: 'var(--shadow-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            {/* Trainer Settings */}
            <div>
              <h3 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Trainer Settings
              </h3>
              <TrainerSettings 
                employeeId={employeeId}
                onUpdate={(settings) => {
                  // Update local state if needed
                  setEmployee({ ...employee, trainer_settings: settings });
                }}
                isViewOnly={isViewOnly}
              />
            </div>
          </div>
        )}

        {/* Management Section - Only visible for managers when profile is approved */}
        {isApproved && isManager && (
          <div 
            className="rounded-lg shadow-lg border p-8 mb-6"
            style={{
              background: 'var(--gradient-card)',
              borderRadius: 'var(--radius-card, 8px)',
              boxShadow: 'var(--shadow-card)',
              borderColor: 'var(--border-default)'
            }}
          >
            <h2 
              className="text-2xl font-semibold mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Management
            </h2>
            <ProfileManagement employeeId={employeeId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeProfilePage;

