// Component - Profile Requests Section
// Allows employees to submit various requests

import React, { useState } from 'react';

function ProfileRequests({ employeeId }) {
  const [requestType, setRequestType] = useState('');

  const handleSubmitRequest = () => {
    if (!requestType) {
      alert('Please select a request type');
      return;
    }
    // TODO: Implement request submission to backend
    alert(`Request to ${requestType} will be submitted. This feature will be available once the request system is integrated.`);
    setRequestType('');
  };

  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Requests
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Submit requests for learning opportunities, trainer applications, or self-learning.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Request Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2 rounded-md border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">Select a request type...</option>
              <option value="learn-new-skills">Request to Learn New Skills</option>
              <option value="apply-trainer">Apply for Trainer Role</option>
              <option value="self-learning">Self-Learning Request</option>
            </select>
          </div>
          <button
            onClick={handleSubmitRequest}
            disabled={!requestType}
            className="px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--bg-button-primary)',
              color: 'var(--text-button-primary)'
            }}
          >
            Submit Request
          </button>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Request system integration coming soon
        </p>
      </div>
    </div>
  );
}

export default ProfileRequests;

