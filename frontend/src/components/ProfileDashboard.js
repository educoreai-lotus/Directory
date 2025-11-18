// Component - Profile Dashboard Section
// Redirects to Learning Analytics microservice

import React from 'react';

function ProfileDashboard({ employeeId }) {
  const handleViewDashboard = () => {
    // TODO: Redirect to Learning Analytics microservice frontend
    // For now, show a message
    alert('Learning Analytics Dashboard will be available once the microservice is integrated.');
  };

  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Learning Dashboard
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          View your learning progress, activity summary, and recent updates.
        </p>
        <button
          onClick={handleViewDashboard}
          className="px-4 py-2 rounded-md text-sm"
          style={{
            background: 'var(--bg-button-primary)',
            color: 'var(--text-button-primary)'
          }}
        >
          View Dashboard
        </button>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Learning Analytics integration coming soon
        </p>
      </div>
    </div>
  );
}

export default ProfileDashboard;

