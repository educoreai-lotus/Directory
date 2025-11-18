// Component - Profile Courses Section
// Displays employee courses (to be integrated with Course Builder)

import React from 'react';

function ProfileCourses({ employeeId }) {
  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Courses
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Assigned Courses
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No courses assigned yet. Courses will appear here once integrated with Course Builder.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              In Progress
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No courses in progress.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Completed
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No completed courses yet.
            </p>
          </div>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Course Builder integration coming soon
        </p>
      </div>
    </div>
  );
}

export default ProfileCourses;

