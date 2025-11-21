// Component - Profile Management
// Displays the hierarchy of teams and employees managed by a manager

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getManagerHierarchy } from '../services/employeeService';

function ProfileManagement({ employeeId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    const fetchHierarchy = async () => {
      if (!user?.companyId || !employeeId) return;

      try {
        setLoading(true);
        setError(null);
        console.log('[ProfileManagement] Fetching hierarchy for employee:', employeeId, 'company:', user.companyId);
        const response = await getManagerHierarchy(user.companyId, employeeId);
        console.log('[ProfileManagement] Raw response:', JSON.stringify(response, null, 2));
        console.log('[ProfileManagement] Raw response type:', typeof response);
        console.log('[ProfileManagement] Raw response keys:', response ? Object.keys(response) : 'null');
        
        // Handle envelope structure: { requester_service: 'directory_service', response: { success: true, hierarchy: {...} } }
        let hierarchyData = null;
        
        // Try multiple parsing strategies - check all possible paths
        if (response?.response?.hierarchy) {
          hierarchyData = response.response.hierarchy;
          console.log('[ProfileManagement] ✅ Found hierarchy in response.response.hierarchy');
        } else if (response?.response && response.response.manager_type) {
          // If response.response itself is the hierarchy
          hierarchyData = response.response;
          console.log('[ProfileManagement] ✅ Found hierarchy as response.response (direct)');
        } else if (response?.hierarchy) {
          hierarchyData = response.hierarchy;
          console.log('[ProfileManagement] ✅ Found hierarchy in response.hierarchy');
        } else if (response?.manager_type) {
          // If the response itself is the hierarchy
          hierarchyData = response;
          console.log('[ProfileManagement] ✅ Found hierarchy as response (direct)');
        } else {
          // Last resort: check if response has nested structure
          console.log('[ProfileManagement] Checking nested structures...');
          console.log('[ProfileManagement] response:', response);
          if (response && typeof response === 'object') {
            // Try to find hierarchy anywhere in the object
            const findHierarchy = (obj, path = '') => {
              if (!obj || typeof obj !== 'object') return null;
              if (obj.manager_type) return obj;
              for (const key in obj) {
                if (key === 'hierarchy' && obj[key] && obj[key].manager_type) {
                  return obj[key];
                }
                const found = findHierarchy(obj[key], `${path}.${key}`);
                if (found) return found;
              }
              return null;
            };
            hierarchyData = findHierarchy(response);
            if (hierarchyData) {
              console.log('[ProfileManagement] ✅ Found hierarchy via deep search');
            }
          }
        }
        
        console.log('[ProfileManagement] Final hierarchyData:', JSON.stringify(hierarchyData, null, 2));
        console.log('[ProfileManagement] hierarchyData type:', typeof hierarchyData);
        console.log('[ProfileManagement] hierarchyData?.manager_type:', hierarchyData?.manager_type);
        console.log('[ProfileManagement] hierarchyData?.team:', hierarchyData?.team);
        console.log('[ProfileManagement] hierarchyData?.department:', hierarchyData?.department);
        console.log('[ProfileManagement] hierarchyData?.employees:', hierarchyData?.employees);
        console.log('[ProfileManagement] hierarchyData?.teams:', hierarchyData?.teams);
        console.log('[ProfileManagement] hierarchyData keys:', hierarchyData ? Object.keys(hierarchyData) : 'null');
        
        if (hierarchyData && hierarchyData.manager_type) {
          console.log('[ProfileManagement] ✅ Valid hierarchy data found, setting state');
          setHierarchy(hierarchyData);
        } else {
          console.warn('[ProfileManagement] ⚠️ Invalid hierarchy data structure');
          console.warn('[ProfileManagement] Expected hierarchy.manager_type but got:', hierarchyData);
          console.warn('[ProfileManagement] Full response structure:', response);
          setError('Invalid hierarchy data structure received');
          setHierarchy(null);
        }
      } catch (err) {
        console.error('[ProfileManagement] Error fetching hierarchy:', err);
        console.error('[ProfileManagement] Error details:', err.response?.data);
        setError('Failed to load management hierarchy.');
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [employeeId, user?.companyId]);

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  if (loading) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading management hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
        <p style={{ color: 'var(--text-error, #ef4444)' }}>{error}</p>
      </div>
    );
  }

  if (!hierarchy) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No management hierarchy available</p>
      </div>
    );
  }

  // Department Manager View - Match CompanyHierarchy UI style
  if (hierarchy.manager_type === 'department_manager') {
    const dept = hierarchy.department;
    const isDeptExpanded = expandedTeams[dept.id] !== undefined ? expandedTeams[dept.id] : false; // Default collapsed

    return (
      <div className="w-full space-y-4">
        <div
          key={dept.id}
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}
        >
          <div
            className="p-4 cursor-pointer flex items-center justify-between hover:bg-opacity-50 transition-colors"
            onClick={() => toggleTeam(dept.id)}
            style={{ background: 'var(--bg-primary)' }}
          >
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {dept.department_name}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {hierarchy.teams?.length || 0} team{(hierarchy.teams?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <svg
              className={`w-5 h-5 transform transition-transform ${isDeptExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isDeptExpanded && (
            <div className="p-4 space-y-3">
              {hierarchy.teams && hierarchy.teams.length > 0 ? (
                hierarchy.teams.map((teamData) => {
                  const team = teamData.team;
                  const isTeamExpanded = expandedTeams[team.id];

                  return (
                    <div
                      key={team.id}
                      className="border rounded p-3"
                      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleTeam(team.id)}
                      >
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {team.team_name}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {teamData.employees.length} employee{teamData.employees.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <svg
                          className={`w-4 h-4 transform transition-transform ${isTeamExpanded ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--text-secondary)' }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {isTeamExpanded && (
                        <div className="mt-3 space-y-2">
                          {teamData.employees.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No employees in this team</p>
                          ) : (
                            teamData.employees.map((employee) => (
                              <div
                                key={employee.id}
                                className="p-2 rounded flex items-start justify-between"
                                style={{ background: 'var(--bg-card)' }}
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {employee.full_name}
                                  </p>
                                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {employee.email}
                                  </p>
                                  {employee.current_role_in_company && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                      {employee.current_role_in_company}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/employee/${employee.id}`);
                                  }}
                                  className="ml-3 px-3 py-1 text-xs border rounded hover:bg-opacity-50 transition-colors"
                                  style={{ 
                                    borderColor: 'var(--border-default)', 
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  View Profile
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No teams in this department</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Team Manager View - Match CompanyHierarchy UI style
  if (hierarchy.manager_type === 'team_manager') {
    const team = hierarchy.team;
    const isTeamExpanded = expandedTeams[team.id] !== undefined ? expandedTeams[team.id] : false; // Default collapsed

    return (
      <div className="w-full space-y-4">
        <div
          key={team.id}
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}
        >
          <div
            className="p-4 cursor-pointer flex items-center justify-between hover:bg-opacity-50 transition-colors"
            onClick={() => toggleTeam(team.id)}
            style={{ background: 'var(--bg-primary)' }}
          >
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {team.team_name}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {hierarchy.employees?.length || 0} employee{(hierarchy.employees?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <svg
              className={`w-5 h-5 transform transition-transform ${isTeamExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isTeamExpanded && (
            <div className="p-4 space-y-2">
              {hierarchy.employees && hierarchy.employees.length > 0 ? (
                hierarchy.employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-2 rounded flex items-start justify-between"
                    style={{ background: 'var(--bg-card)' }}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {employee.full_name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {employee.email}
                      </p>
                      {employee.current_role_in_company && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {employee.current_role_in_company}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employee/${employee.id}`);
                      }}
                      className="ml-3 px-3 py-1 text-xs border rounded hover:bg-opacity-50 transition-colors"
                      style={{ 
                        borderColor: 'var(--border-default)', 
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No employees in this team</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default ProfileManagement;

