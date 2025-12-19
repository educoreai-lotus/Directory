// Frontend Component - Trainer Settings
// Allows trainers to update their AI enabled and public publish settings

import React, { useState, useEffect } from 'react';
import { updateTrainerSettings, getTrainerSettings } from '../services/trainerService';

function TrainerSettings({ employeeId, onUpdate, isViewOnly = false }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    aiEnabled: false,
    publicPublishEnable: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTrainerSettings(employeeId);
        
        setSettings({
          aiEnabled: data.ai_enabled || false,
          publicPublishEnable: data.public_publish_enable || false
        });
      } catch (err) {
        console.error('Error fetching trainer settings:', err);
        setError(err.response?.data?.error || 'Failed to load trainer settings');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchSettings();
    }
  }, [employeeId]);

  const handleToggle = async (field) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const newSettings = {
        ...settings,
        [field]: !settings[field]
      };

      await updateTrainerSettings(employeeId, {
        aiEnabled: newSettings.aiEnabled,
        publicPublishEnable: newSettings.publicPublishEnable
      });

      setSettings(newSettings);
      setSuccess(true);
      
      if (onUpdate) {
        onUpdate(newSettings);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating trainer settings:', err);
      // Error message is already extracted in trainerService
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div 
          className="p-3 rounded-lg text-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--border-error)',
            color: 'var(--text-error)'
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div 
          className="p-3 rounded-lg text-sm"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgb(34, 197, 94)',
            color: 'rgb(34, 197, 94)'
          }}
        >
          Settings updated successfully!
        </div>
      )}

      {/* AI Enabled Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            AI-Enabled Content
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Allow AI to automatically adjust and optimize your course content
          </p>
        </div>
        <button
          onClick={() => handleToggle('aiEnabled')}
          disabled={saving || isViewOnly}
          className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.aiEnabled ? 'bg-teal-600' : 'bg-gray-300'
          }`}
          style={{ opacity: (saving || isViewOnly) ? 0.6 : 1, cursor: (saving || isViewOnly) ? 'not-allowed' : 'pointer' }}
          title={isViewOnly ? 'View-only mode: Cannot modify settings' : ''}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Public Publish Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Public Publishing
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Allow your courses to be shared across companies
          </p>
        </div>
        <button
          onClick={() => handleToggle('publicPublishEnable')}
          disabled={saving || isViewOnly}
          className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.publicPublishEnable ? 'bg-teal-600' : 'bg-gray-300'
          }`}
          style={{ opacity: (saving || isViewOnly) ? 0.6 : 1, cursor: (saving || isViewOnly) ? 'not-allowed' : 'pointer' }}
          title={isViewOnly ? 'View-only mode: Cannot modify settings' : ''}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.publicPublishEnable ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default TrainerSettings;

