// Component - Company Hierarchy
// Displays organizational hierarchy (departments -> teams -> employees)

import React, { useState } from 'react';

function CompanyHierarchy({ hierarchy }) {
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});

  if (!hierarchy || Object.keys(hierarchy).length === 0) {
    return (
      <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No organizational hierarchy available</p>
      </div>
    );
  }

  const toggleDepartment = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  return (
    <div className="w-full space-y-4">
      {Object.values(hierarchy).map((deptData) => {
        const dept = deptData.department;
        const isDeptExpanded = expandedDepartments[dept.id];

        return (
          <div
            key={dept.id}
            className="border rounded-lg overflow-hidden"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}
          >
            <div
              className="p-4 cursor-pointer flex items-center justify-between hover:bg-opacity-50 transition-colors"
              onClick={() => toggleDepartment(dept.id)}
              style={{ background: 'var(--bg-primary)' }}
            >
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {dept.department_name}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {deptData.teams.length} team{deptData.teams.length !== 1 ? 's' : ''}
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
                {deptData.teams.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No teams in this department</p>
                ) : (
                  deptData.teams.map((teamData) => {
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
                                  className="p-2 rounded"
                                  style={{ background: 'var(--bg-card)' }}
                                >
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {employee.full_name}
                                  </p>
                                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {employee.email}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CompanyHierarchy;

