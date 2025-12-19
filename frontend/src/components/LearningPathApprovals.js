// Component - Learning Path Approvals
// Displays pending learning path approval requests for Decision Maker employees

import React, { useState, useEffect } from 'react';

function LearningPathApprovals({ employeeId, companyId }) {



  const handleReview = () => {
    // Redirect to Learner AI frontend with employee_id
    const baseUrl = process.env.REACT_APP_LEARNER_AI_URL || 'https://learner-ai-omega.vercel.app';
    
    if (!employeeId) {
      console.error('[LearningPathApprovals] Cannot redirect: Employee ID is missing');
      alert('Error: Employee ID not found. Please try again.');
      return;
    }
    
    // Build URL with employee_id as query parameter
    const learnerAIUrl = `${baseUrl}?employee_id=${encodeURIComponent(employeeId)}`;
    
    console.log('[LearningPathApprovals] Redirecting to Learner AI:', learnerAIUrl);
    console.log('[LearningPathApprovals] Employee ID (UUID):', employeeId);
    window.location.href = learnerAIUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Learning Paths Approvals
        </h3>
        <button
          onClick={handleReview}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            background: 'var(--gradient-primary, linear-gradient(135deg, #059669, #047857))',
            color: 'var(--text-inverse, #ffffff)'
          }}
        >
          Review
        </button>
      </div>
    </div>
  );
}

export default LearningPathApprovals;

