// Component - Company Analytics Dashboard
// Displays mock analytics data (will connect to Learning Analytics microservice later)

import React from 'react';

function CompanyAnalyticsDashboard({ companyId }) {
  // Mock analytics data - will be replaced with API call to Learning Analytics microservice
  const mockAnalytics = {
    totalCourses: 45,
    activeEnrollments: 120,
    completedCourses: 89,
    averageCompletionRate: 78,
    topSkills: [
      { skill: 'JavaScript', learners: 45, completionRate: 82 },
      { skill: 'React', learners: 38, completionRate: 75 },
      { skill: 'Node.js', learners: 32, completionRate: 88 }
    ],
    learningPaths: [
      { path: 'Frontend Developer', enrolled: 25, completed: 18 },
      { path: 'Backend Developer', enrolled: 20, completed: 15 },
      { path: 'Full Stack Developer', enrolled: 15, completed: 12 }
    ],
    recentActivity: [
      { employee: 'John Doe', action: 'Completed', course: 'Advanced React', date: '2024-01-15' },
      { employee: 'Jane Smith', action: 'Started', course: 'Node.js Fundamentals', date: '2024-01-14' },
      { employee: 'Bob Johnson', action: 'Completed', course: 'TypeScript Basics', date: '2024-01-13' }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Analytics data will be fetched from Learning Analytics microservice
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Courses</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {mockAnalytics.totalCourses}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Enrollments</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {mockAnalytics.activeEnrollments}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completed</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {mockAnalytics.completedCourses}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Completion Rate</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {mockAnalytics.averageCompletionRate}%
          </p>
        </div>
      </div>

      {/* Top Skills */}
      <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Top Skills in Learning
        </h3>
        <div className="space-y-3">
          {mockAnalytics.topSkills.map((skill, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{skill.skill}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {skill.learners} learners
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {skill.completionRate}%
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>completion</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Paths */}
      <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Learning Paths
        </h3>
        <div className="space-y-3">
          {mockAnalytics.learningPaths.map((path, index) => (
            <div key={index} className="border rounded p-3" style={{ borderColor: 'var(--border-default)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{path.path}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {path.enrolled} enrolled
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {path.completed} completed
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </h3>
        <div className="space-y-2">
          {mockAnalytics.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-primary)' }}>
                <strong>{activity.employee}</strong> {activity.action} <strong>{activity.course}</strong>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{activity.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompanyAnalyticsDashboard;

