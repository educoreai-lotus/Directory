// Component - Profile Career Path Section
// Displays employee career path competencies from Skills Engine in a simple list view

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployeeCareerPathCompetencies } from '../services/employeeService';

function ProfileCareerPath({ employeeId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [competencies, setCompetencies] = useState([]);

  useEffect(() => {
    const fetchCompetencies = async () => {
      if (!user?.companyId || !employeeId) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log('[ProfileCareerPath] Fetching career path competencies...');
        
        const response = await getEmployeeCareerPathCompetencies(user.companyId, employeeId);
        
        console.log('[ProfileCareerPath] Response:', JSON.stringify(response, null, 2));
        
        // Handle envelope structure: { requester_service: 'directory_service', response: { success: true, competencies: [...] } }
        const data = response?.response || response;
        const competenciesList = data?.competencies || [];
        
        console.log('[ProfileCareerPath] Competencies:', competenciesList);
        setCompetencies(competenciesList);
      } catch (err) {
        console.error('[ProfileCareerPath] Error fetching competencies:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load career path competencies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetencies();
  }, [employeeId, user?.companyId]);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Career Path
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading career path competencies...
          </p>
        </div>
      </div>
    );
  }

  if (error && competencies.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Career Path
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-error, #ef4444)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Career Path
      </h2>
      <div className="p-6 rounded-lg border" style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)'
      }}>
        {competencies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {competencies.map((competency, idx) => {
              const competencyName = competency.competency_name || competency.name || '';
              
              return (
                <div
                  key={competency.competency_id || idx}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: 'var(--bg-primary, #f8fafc)',
                    border: '1px solid var(--border-default, #e2e8f0)',
                    color: 'var(--text-secondary, #64748b)',
                    fontWeight: '500'
                  }}
                >
                  <span>{competencyName}</span>
                  
                  {/* Assessment Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!employeeId) {
                        console.error('[ProfileCareerPath] Cannot redirect: employeeId is missing');
                        return;
                      }
                      
                      // Redirect to Assessment with user_id and competency name
                      const assessmentUrl = `https://assessment-seven-liard.vercel.app/exam-intro?examType=baseline&userId=${encodeURIComponent(employeeId)}&skillName=${encodeURIComponent(competencyName)}`;
                      
                      console.log('[ProfileCareerPath] Redirecting to Assessment:', assessmentUrl);
                      console.log('[ProfileCareerPath] Employee ID (UUID):', employeeId);
                      console.log('[ProfileCareerPath] Competency Name:', competencyName);
                      
                      window.location.href = assessmentUrl;
                    }}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Take Assessment"
                  >
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 16 16" 
                      fill="none" 
                      style={{ color: 'var(--text-secondary, #64748b)' }}
                    >
                      <path 
                        d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z" 
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            No career path competencies available yet. Competencies will be displayed here once they are updated by Skills Engine.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfileCareerPath;

