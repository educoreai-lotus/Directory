// Frontend Component - Manual Profile Form
// Handles manual profile data entry for extended enrichment flow
// PHASE_4: This component is part of the extended enrichment flow

import React, { useState } from 'react';
import { saveManualData } from '../services/enrichmentService';

function ManualProfileForm({ employeeId, onSaved }) {
  // PHASE_4: Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    current_role: '',
    target_role: '',
    bio: '',
    projects: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // PHASE_4: Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setSaved(false);
    setError(null);
  };

  // PHASE_4: Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.current_role || !formData.target_role) {
      setError('Please fill in all required fields: name, email, current role, and target role');
      return;
    }

    if (!employeeId) {
      setError('Employee ID is missing');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await saveManualData(employeeId, formData);

      if (result?.success || result?.data) {
        setSaved(true);
        setError(null);
        setIsExpanded(false); // Collapse after save
        if (onSaved) {
          onSaved(result);
        }
      } else {
        throw new Error('Save failed - no success response');
      }
    } catch (err) {
      console.error('[ManualProfileForm] Save error:', err);
      const errorMessage = err.response?.data?.response?.error 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to save manual data. Please try again.';
      setError(errorMessage);
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      {/* PHASE_4: Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Fill Details Manually
        </h3>
        {saved && (
          <div className="flex items-center gap-2">
            <span 
              className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'rgb(34, 197, 94)'
              }}
            >
              <span className="text-green-600 font-bold">✓</span>
              Saved
            </span>
          </div>
        )}
      </div>

      {/* PHASE_4: Description */}
      <p 
        className="text-sm mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Fill in your profile details manually. Required: name, email, current role, target role. Optional: bio and projects.
      </p>

      {/* PHASE_4: Error Message */}
      {error && (
        <div 
          className="mb-4 p-3 rounded-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--border-error)',
            color: 'var(--text-error)'
          }}
        >
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* PHASE_4: Expand/Collapse Button */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="btn btn-secondary w-full mb-4"
        >
          Add or Edit Details Manually
        </button>
      )}

      {/* PHASE_4: Form - Only show when expanded */}
      {isExpanded && (
        <form onSubmit={handleSubmit}>
          {/* Name - Required */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Name <span style={{ color: 'var(--text-error)' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Email - Required */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Email <span style={{ color: 'var(--text-error)' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Current Role - Required */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Current Role <span style={{ color: 'var(--text-error)' }}>*</span>
            </label>
            <input
              type="text"
              name="current_role"
              value={formData.current_role}
              onChange={handleChange}
              placeholder="e.g., Software Engineer"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Target Role - Required */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Target Role <span style={{ color: 'var(--text-error)' }}>*</span>
            </label>
            <input
              type="text"
              name="target_role"
              value={formData.target_role}
              onChange={handleChange}
              placeholder="e.g., Senior Software Engineer"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Bio - Optional */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Bio (Optional)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Your professional bio (will be auto-filled later if left empty)..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Projects - Optional */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Projects (Optional)
            </label>
            <textarea
              name="projects"
              value={formData.projects}
              onChange={handleChange}
              placeholder="List your projects (will be auto-filled later if left empty)..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* PHASE_4: Save Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || saved}
              className="btn btn-secondary flex-1"
              style={{
                opacity: (saving || saved) ? 0.6 : 1,
                cursor: (saving || saved) ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Saving...
                </>
              ) : saved ? (
                '✓ Saved'
              ) : (
                'Save Details'
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="btn btn-secondary"
              style={{
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* PHASE_4: Success Message */}
      {saved && (
        <div 
          className="mt-4 p-3 rounded-lg"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgb(34, 197, 94)',
            color: 'rgb(34, 197, 94)'
          }}
        >
          <p className="text-sm">✓ Manual data saved successfully! Your profile will use this data for enrichment.</p>
        </div>
      )}
    </div>
  );
}

export default ManualProfileForm;

