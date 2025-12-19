// Component - Approved Profile Tabs
// Organizes approved employee profile sections into tabs

import React, { useState } from 'react';
import ProfileSkills from './ProfileSkills';
import ProfileCourses from './ProfileCourses';
import LearningPath from './LearningPath';
import ProfileAnalytics from './ProfileAnalytics';
import ProfileDashboard from './ProfileDashboard';

function ApprovedProfileTabs({ employeeId, user, employee, isViewOnly = false }) {
  const [activeTab, setActiveTab] = useState('skills');

  const tabs = [
    { id: 'skills', label: 'Skills', component: ProfileSkills },
    { id: 'courses', label: 'Courses', component: ProfileCourses },
    { id: 'learning-path', label: 'Learning Path', component: LearningPath },
    { id: 'analytics', label: 'Analytics', component: ProfileAnalytics }
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'analytics') {
      // Redirect to Learning Analytics frontend with user ID
      const baseUrl = process.env.REACT_APP_LEARNING_ANALYTICS_URL || 'https://learning-analytics-frontend-psi.vercel.app';
      
      if (!employeeId) {
        console.error('[ApprovedProfileTabs] Cannot redirect: Employee ID is missing');
        alert('Error: Employee ID not found. Please try again.');
        return;
      }
      
      // Build URL with employee ID as query parameter
      const analyticsUrl = `${baseUrl}?userId=${encodeURIComponent(employeeId)}`;
      
      console.log('[ApprovedProfileTabs] Redirecting to Learning Analytics:', analyticsUrl);
      console.log('[ApprovedProfileTabs] Employee ID (UUID):', employeeId);
      window.location.href = analyticsUrl;
    } else if (tabId === 'courses') {
      // Redirect to Course Builder frontend with user ID
      const baseUrl = process.env.REACT_APP_COURSE_BUILDER_URL || 'https://course-builder-alpha-nine.vercel.app/learner/dashboard';
      
      if (!employeeId) {
        console.error('[ApprovedProfileTabs] Cannot redirect: Employee ID is missing');
        alert('Error: Employee ID not found. Please try again.');
        return;
      }
      
      // Build URL with employee ID as query parameter
      const courseBuilderUrl = `${baseUrl}?userId=${encodeURIComponent(employeeId)}`;
      
      console.log('[ApprovedProfileTabs] Redirecting to Course Builder:', courseBuilderUrl);
      console.log('[ApprovedProfileTabs] Employee ID (UUID):', employeeId);
      window.location.href = courseBuilderUrl;
    } else if (tabId === 'learning-path') {
      // Redirect to Learner AI frontend with user ID
      const baseUrl = process.env.REACT_APP_LEARNER_AI_URL || 'https://learner-ai-omega.vercel.app';
      
      if (!employeeId) {
        console.error('[ApprovedProfileTabs] Cannot redirect: Employee ID is missing');
        alert('Error: Employee ID not found. Please try again.');
        return;
      }
      
      // Build URL with user_id as query parameter
      const learnerAIUrl = `${baseUrl}/?user_id=${encodeURIComponent(employeeId)}`;
      
      console.log('[ApprovedProfileTabs] Redirecting to Learner AI:', learnerAIUrl);
      console.log('[ApprovedProfileTabs] Employee ID (UUID):', employeeId);
      window.location.href = learnerAIUrl;
    } else {
      setActiveTab(tabId);
    }
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-default, #e2e8f0)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid #047857' : '2px solid transparent',
              color: activeTab === tab.id 
                ? '#047857' 
                : 'var(--text-secondary, #475569)',
              background: 'transparent',
              cursor: 'pointer',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {ActiveComponent && <ActiveComponent employeeId={employeeId} user={user} employee={employee} isViewOnly={isViewOnly} />}
      </div>
    </div>
  );
}

export default ApprovedProfileTabs;

