// Component - Learning Path Section
// Displays learning paths (to be integrated with Learner AI)

import React from 'react';

function LearningPath({ employeeId }) {
  const handleViewLearningPath = () => {
    // TODO: Redirect to Learner AI microservice frontend
    alert('Learning Path will be available once the Learner AI microservice is integrated.');
  };

  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Learning Path
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          View your assigned learning paths, track progress, and get personalized recommendations.
        </p>
        <button
          onClick={handleViewLearningPath}
          className="px-4 py-2 rounded-md text-sm"
          style={{
            background: 'var(--bg-button-primary)',
            color: 'var(--text-button-primary)'
          }}
        >
          View Learning Path
        </button>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Learner AI integration coming soon
        </p>
      </div>
    </div>
  );
}

export default LearningPath;

