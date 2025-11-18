// Component - Profile Skills Section
// Displays employee skills (to be integrated with Skills Engine)

import React from 'react';

function ProfileSkills({ employeeId }) {
  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Skills
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Your skills will be displayed here once integrated with the Skills Engine microservice.
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-md text-sm"
            style={{
              background: 'var(--bg-button-primary)',
              color: 'var(--text-button-primary)'
            }}
            disabled
          >
            View Skills Gap
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm"
            style={{
              background: 'var(--bg-button-secondary)',
              color: 'var(--text-button-secondary)'
            }}
            disabled
          >
            More Skills
          </button>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Skills Engine integration coming soon
        </p>
      </div>
    </div>
  );
}

export default ProfileSkills;

