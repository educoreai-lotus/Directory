// Frontend Component - Manual Profile Form
// Handles manual profile data entry for extended enrichment flow
// PHASE_4: This component is part of the extended enrichment flow

import React, { useState } from 'react';
import { saveManualData } from '../services/enrichmentService';

function ManualProfileForm({ employeeId, onSaved }) {
  // PHASE_4: Form state
  const [formData, setFormData] = useState({
    work_experience: '',
    skills: '',
    languages: '',
    education: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

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

    // Validate at least one field is filled
    const hasData = Object.values(formData).some(value => value.trim().length > 0);
    if (!hasData) {
      setError('Please fill at least one field');
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
        Fill in your profile details manually. You can provide work experience, skills, languages, and education.
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

      {/* PHASE_4: Form */}
      <form onSubmit={handleSubmit}>
        {/* Work Experience */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Work Experience
          </label>
          <textarea
            name="work_experience"
            value={formData.work_experience}
            onChange={handleChange}
            placeholder="Describe your work experience, roles, and responsibilities..."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Skills */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Skills (comma-separated)
          </label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., JavaScript, Python, React, Node.js"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Languages */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Languages (comma-separated)
          </label>
          <input
            type="text"
            name="languages"
            value={formData.languages}
            onChange={handleChange}
            placeholder="e.g., English, Spanish, French"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Education */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Education
          </label>
          <textarea
            name="education"
            value={formData.education}
            onChange={handleChange}
            placeholder="List your degrees, certifications, and educational background..."
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
        <button
          type="submit"
          disabled={saving || saved}
          className="btn btn-secondary w-full"
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
      </form>

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

