// Component - Pending Requests Section
// Displays pending requests that require company approval

import React, { useState } from 'react';

function PendingRequestsSection({ companyId }) {
  // Mock pending requests data - will be replaced with API call
  const [requests] = useState([
    {
      id: 'req-1',
      type: 'profile_update',
      employee: { id: 'emp-1', name: 'John Doe', email: 'john@company.com' },
      request: 'Update current role from "Software Engineer" to "Senior Software Engineer"',
      submittedAt: '2024-01-15',
      priority: 'medium'
    },
    {
      id: 'req-2',
      type: 'learning_path',
      employee: { id: 'emp-2', name: 'Jane Smith', email: 'jane@company.com' },
      request: 'Request approval for "Full Stack Developer" learning path',
      submittedAt: '2024-01-14',
      priority: 'high'
    },
    {
      id: 'req-3',
      type: 'trainer_role',
      employee: { id: 'emp-3', name: 'Bob Johnson', email: 'bob@company.com' },
      request: 'Request to become a Trainer',
      submittedAt: '2024-01-13',
      priority: 'medium'
    },
    {
      id: 'req-4',
      type: 'skill_request',
      employee: { id: 'emp-4', name: 'Alice Williams', email: 'alice@company.com' },
      request: 'Request to learn "Machine Learning" skill',
      submittedAt: '2024-01-12',
      priority: 'low'
    }
  ]);

  const handleApprove = (requestId) => {
    console.log('Approve request:', requestId);
    // TODO: Implement approval logic
  };

  const handleReject = (requestId) => {
    console.log('Reject request:', requestId);
    // TODO: Implement rejection logic
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      profile_update: 'Profile Update',
      learning_path: 'Learning Path',
      trainer_role: 'Trainer Role Request',
      skill_request: 'Skill Request'
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Pending Requests ({requests.length})
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Review and approve employee requests
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No pending requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 rounded-lg border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-1 text-xs rounded"
                      style={{
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)'
                      }}
                    >
                      {getRequestTypeLabel(request.type)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {request.employee.name} ({request.employee.email})
                  </p>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {request.request}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Submitted: {request.submittedAt}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(request.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={() => console.log('View employee:', request.employee.id)}
                  className="px-4 py-2 border rounded hover:bg-opacity-50 transition-colors text-sm"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                >
                  View Employee
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingRequestsSection;

