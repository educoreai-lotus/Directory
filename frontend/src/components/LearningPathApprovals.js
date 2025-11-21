// Component - Learning Path Approvals
// Displays pending learning path approval requests for Decision Maker employees

import React, { useState, useEffect } from 'react';

function LearningPathApprovals({ employeeId, companyId }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call when Learner AI microservice is integrated
        // For now, using mock data
        const mockApprovals = [
          {
            id: '1',
            employee_name: 'John Doe',
            employee_email: 'john.doe@company.com',
            learning_path_name: 'Frontend Developer Career Path',
            requested_at: '2025-01-15T10:30:00Z',
            status: 'pending'
          },
          {
            id: '2',
            employee_name: 'Jane Smith',
            employee_email: 'jane.smith@company.com',
            learning_path_name: 'Backend Developer Career Path',
            requested_at: '2025-01-15T11:00:00Z',
            status: 'pending'
          }
        ];
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setApprovals(mockApprovals);
      } catch (err) {
        console.error('Error fetching learning path approvals:', err);
        setError('Failed to load learning path approvals');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId && companyId) {
      fetchApprovals();
    }
  }, [employeeId, companyId]);

  const handleViewApproval = (approvalId) => {
    // TODO: Redirect to Learner AI microservice frontend
    // For now, show placeholder message
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
      alert(`Redirecting to Learner AI microservice to review: ${approval.learning_path_name}\n\nEmployee: ${approval.employee_name} (${approval.employee_email})\n\n(Learner AI integration coming soon)`);
      // When Learner AI is integrated:
      // window.open(`${LEARNER_AI_URL}/approvals/${approvalId}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
        Loading learning path approvals...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg" style={{ 
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgb(239, 68, 68)',
        color: 'rgb(239, 68, 68)'
      }}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.length > 0 && (
        <div className="flex justify-end mb-4">
          <span 
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'rgb(239, 68, 68)'
            }}
          >
            {approvals.length} waiting approval{approvals.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No pending learning path approvals
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="p-4 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-default)'
              }}
              onClick={() => handleViewApproval(approval.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 
                    className="font-semibold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {approval.learning_path_name}
                  </h4>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Employee: {approval.employee_name} ({approval.employee_email})
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Requested: {new Date(approval.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="px-4 py-2 rounded text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--gradient-primary, linear-gradient(135deg, #059669, #047857))',
                    color: 'var(--text-inverse, #ffffff)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewApproval(approval.id);
                  }}
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LearningPathApprovals;

