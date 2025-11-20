// Component - Pending Requests Section
// Displays pending requests that require company approval

import React, { useState, useEffect } from 'react';
import { getCompanyRequests } from '../services/employeeService';

function PendingRequestsSection({ companyId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!companyId) return;

      try {
        setLoading(true);
        setError(null);
        console.log('[PendingRequestsSection] Fetching pending requests for company:', companyId);
        const response = await getCompanyRequests(companyId, 'pending');
        console.log('[PendingRequestsSection] Response:', response);
        const requestsData = response?.requests || response?.data?.requests || response?.response?.requests || [];
        console.log('[PendingRequestsSection] Parsed requests:', requestsData.length, requestsData);
        setRequests(requestsData);
      } catch (err) {
        console.error('[PendingRequestsSection] Error fetching requests:', err);
        setError('Failed to load pending requests.');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    
    // Refresh every 5 seconds to catch new requests
    const interval = setInterval(fetchRequests, 5000);
    
    return () => clearInterval(interval);
  }, [companyId]);

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
      'learn-new-skills': 'Learn New Skills',
      'apply-trainer': 'Apply for Trainer Role',
      'self-learning': 'Self-Learning Request',
      'other': 'Other Request',
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Pending Requests
          </h3>
        </div>
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Pending Requests
          </h3>
        </div>
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-error, #ef4444)' }}>{error}</p>
        </div>
      </div>
    );
  }

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
                      {getRequestTypeLabel(request.request_type || request.type)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(request.priority || 'medium')}`}>
                      {request.priority || 'medium'}
                    </span>
                  </div>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {request.employee_name || request.employee?.name} ({request.employee_email || request.employee?.email})
                  </p>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {request.title || request.request}
                  </p>
                  {request.description && (
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {request.description}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Submitted: {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : request.submittedAt}
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
                  onClick={() => window.location.href = `/employee/${request.employee_id || request.employee?.id}`}
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


