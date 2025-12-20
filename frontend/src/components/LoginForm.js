// Frontend Component - Login Form
// Form for user login

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginForm() {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    const result = await login(formData.email, formData.password);

    if (!result.success) {
      setSubmitError(result.error || 'Login failed. Please try again.');
    }
    // If successful, login function handles navigation
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
      <div>
        <label 
          htmlFor="email" 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'var(--bg-card)',
            borderColor: errors.email ? 'var(--border-error)' : 'var(--border-default)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--border-focus)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border-focus)';
            e.target.style.boxShadow = '0 0 0 3px rgba(4, 120, 87, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors.email ? 'var(--border-error)' : 'var(--border-default)';
            e.target.style.boxShadow = 'none';
          }}
          placeholder="Enter your email"
          disabled={loading}
        />
        {errors.email && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-error)' }}>
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label 
          htmlFor="password" 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'var(--bg-card)',
            borderColor: errors.password ? 'var(--border-error)' : 'var(--border-default)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--border-focus)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border-focus)';
            e.target.style.boxShadow = '0 0 0 3px rgba(4, 120, 87, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors.password ? 'var(--border-error)' : 'var(--border-default)';
            e.target.style.boxShadow = 'none';
          }}
          placeholder="Enter your password"
          disabled={loading}
        />
        {errors.password && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-error)' }}>
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div 
          className="p-3 rounded-lg"
          style={{
            background: 'var(--bg-error)',
            border: '1px solid var(--border-error)'
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-error)' }}>
            {submitError}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
        style={{
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Logging in...' : 'LOGIN'}
      </button>
    </form>
  );
}

export default LoginForm;

