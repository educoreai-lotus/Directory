// Frontend Component - Manual Profile Form
// Handles manual profile data entry for extended enrichment flow
// PHASE_4: This component is part of the extended enrichment flow

import React, { useState, useEffect } from 'react';
import { saveManualData } from '../services/enrichmentService';

function ManualProfileForm({ employeeId, onSaved, isRequired = false, onFormDataChange }) {
  // PHASE_4: Form state - only work_experience, skills, education (all optional)
  const [formData, setFormData] = useState({
    work_experience: '',
    skills: '',
    education: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  // Notify parent of initial form state on mount
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - we don't want to re-trigger on every formData change

  // PHASE_4: Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    setSaved(false);
    setError(null);
    
    // Notify parent of form data changes for validation
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  };

  // PHASE_4: Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate based on isRequired prop
    // If form is required (no GitHub/PDF), at least one field must be filled
    // If form is optional (has GitHub/PDF), allow empty submission
    const isManualFormEmpty = 
      (!formData.skills || formData.skills.trim() === "") &&
      (!formData.education || formData.education.trim() === "") &&
      (!formData.work_experience || formData.work_experience.trim() === "");

    if (isRequired && isManualFormEmpty) {
      setError('To enrich your profile without GitHub or CV, please fill at least one field (skills, education, or work experience).');
      return;
    }

    if (!employeeId) {
      setError('Employee ID is missing');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Ensure all fields are strings (empty strings, not undefined)
      const normalizedFormData = {
        skills: formData.skills || '',
        education: formData.education || '',
        work_experience: formData.work_experience || ''
      };

      const result = await saveManualData(employeeId, normalizedFormData);

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
      {/* PHASE_4: Collapsed state - single line button */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full text-left p-3 rounded-lg border transition-all"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover, #14b8a6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
        >
            <span className="flex items-center justify-between">
            <span className="text-sm font-medium">
              ▼ Fill Manual Details {isRequired ? '(required)' : '(optional)'}
            </span>
            {saved && (
              <span 
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: 'rgb(34, 197, 94)'
                }}
              >
                ✓ Saved
              </span>
            )}
          </span>
        </button>
      )}

      {/* PHASE_4: Expanded state - form */}
      {isExpanded && (
        <div 
          className="p-4 rounded-lg border"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)'
          }}
        >
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Fill Manual Details {isRequired ? '(required)' : '(optional)'}
            </h3>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-sm px-3 py-1 rounded hover:bg-gray-100"
              style={{ color: 'var(--text-secondary)' }}
            >
              ▲ Collapse
            </button>
          </div>

          {/* PHASE_4: Description */}
          <p 
            className="text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isRequired 
              ? 'Provide your work experience, skills, and education manually. At least one field is required since you don\'t have GitHub or CV uploaded.'
              : 'Provide your work experience, skills, and education manually. All fields are optional.'}
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
                placeholder="Describe your work experience, roles, and responsibilities. You can use bullets or paragraphs."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border-input)',
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
              <textarea
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., JavaScript, React, Node.js, PostgreSQL"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border-input)',
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
                placeholder="List your degrees, certifications, and educational background."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  background: 'var(--bg-input)',
                  borderColor: 'var(--border-input)',
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
      )}
    </div>
  );
}

export default ManualProfileForm;
