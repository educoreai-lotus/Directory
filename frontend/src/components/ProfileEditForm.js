// Component - Profile Edit Form
// Allows employees to edit their own profile fields

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateEmployee } from '../services/employeeService';

function ProfileEditForm({ employee, onSave, onCancel }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    preferred_language: '',
    bio: '',
    value_proposition: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        preferred_language: employee.preferred_language || '',
        bio: employee.bio || '',
        value_proposition: employee.value_proposition || ''
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.preferred_language.trim()) {
      newErrors.preferred_language = 'Preferred language is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setSuccess(null);
    setErrors({});

    try {
      await updateEmployee(user.companyId, employee.id, formData);
      setSuccess('Profile updated successfully!');
      
      // Call onSave callback to refresh profile data
      if (onSave) {
        setTimeout(() => {
          onSave();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Edit Profile
      </h2>
      <div 
        className="p-6 rounded-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}
      >
        {success && (
          <div className="mb-4 p-3 rounded" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgb(34, 197, 94)',
            color: 'rgb(34, 197, 94)'
          }}>
            <p className="text-sm">{success}</p>
          </div>
        )}

        {errors.submit && (
          <div className="mb-4 p-3 rounded" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgb(239, 68, 68)',
            color: 'rgb(239, 68, 68)'
          }}>
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Preferred Language <span className="text-red-500">*</span>
            </label>
            <select
              name="preferred_language"
              value={formData.preferred_language}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: errors.preferred_language ? 'rgb(239, 68, 68)' : 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">Select language...</option>
              <option value="en">English</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="he">Hebrew (עברית)</option>
              <option value="ru">Russian (Русский)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="it">Italian (Italiano)</option>
              <option value="pt">Portuguese (Português)</option>
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="ko">Korean (한국어)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="tr">Turkish (Türkçe)</option>
              <option value="pl">Polish (Polski)</option>
              <option value="nl">Dutch (Nederlands)</option>
              <option value="sv">Swedish (Svenska)</option>
              <option value="da">Danish (Dansk)</option>
              <option value="fi">Finnish (Suomi)</option>
              <option value="no">Norwegian (Norsk)</option>
              <option value="cs">Czech (Čeština)</option>
              <option value="ro">Romanian (Română)</option>
              <option value="hu">Hungarian (Magyar)</option>
              <option value="el">Greek (Ελληνικά)</option>
              <option value="th">Thai (ไทย)</option>
              <option value="vi">Vietnamese (Tiếng Việt)</option>
              <option value="id">Indonesian (Bahasa Indonesia)</option>
              <option value="ms">Malay (Bahasa Melayu)</option>
              <option value="uk">Ukrainian (Українська)</option>
            </select>
            {errors.preferred_language && (
              <p className="text-xs mt-1" style={{ color: 'rgb(239, 68, 68)' }}>
                {errors.preferred_language}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={6}
              className="w-full px-3 py-2 rounded-md border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Value Proposition
            </label>
            <textarea
              name="value_proposition"
              value={formData.value_proposition}
              onChange={handleChange}
              rows={6}
              className="w-full px-3 py-2 rounded-md border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
              placeholder="Describe your value proposition..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-button-primary)',
                color: 'var(--text-button-primary)'
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--bg-button-secondary)',
                  color: 'var(--text-button-secondary)'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileEditForm;

