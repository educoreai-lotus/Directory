import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyRegistrationFormFields from '../components/CompanyRegistrationFormFields';
import { registerCompany } from '../services/companyRegistrationService';

function CompanyRegistrationForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    domain: '',
    hr_contact_name: '',
    hr_contact_email: '',
    hr_contact_role: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.industry.trim()) {
      newErrors.industry = 'Industry is required';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Company domain is required';
    } else {
      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(formData.domain)) {
        newErrors.domain = 'Please enter a valid domain (e.g., example.com)';
      }
    }

    if (!formData.hr_contact_name.trim()) {
      newErrors.hr_contact_name = 'HR contact name is required';
    }

    if (!formData.hr_contact_email.trim()) {
      newErrors.hr_contact_email = 'HR contact email is required';
    } else {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.hr_contact_email)) {
        newErrors.hr_contact_email = 'Please enter a valid email address';
      }
    }

    if (!formData.hr_contact_role.trim()) {
      newErrors.hr_contact_role = 'HR contact role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerCompany(formData);
      
      // Response structure after API interceptor parsing:
      // response.data = { requester_service: '...', response: { company_id: '...', ... } }
      // So we access: response.data.response.company_id
      console.log('Registration response:', response);
      
      const result = response?.response || response?.data?.response;
      const companyId = result?.company_id;

      if (companyId) {
        setRegistrationSuccess({
          company_id: companyId,
          company_name: result?.company_name || formData.company_name,
          domain: result?.domain || formData.domain,
          verification_status: result?.verification_status
        });
      } else {
        console.error('Unexpected response format:', response);
        setErrors({ submit: 'Registration failed. Please check the response format.' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Registration error response:', error.response?.data);
      
      // Extract error message from response
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.response?.data) {
        // Check if response follows standard format
        if (error.response.data.response?.error) {
          errorMessage = error.response.data.response.error;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          // Try to parse if it's a stringified JSON
          try {
            const parsed = JSON.parse(error.response.data);
            errorMessage = parsed.response?.error || parsed.error || errorMessage;
          } catch (e) {
            // Not JSON, use as-is
            errorMessage = error.response.data;
          }
        }
      }
      
      setErrors({ 
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative py-12 px-4"
      style={{
        background: 'var(--bg-body, var(--bg-primary))',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
      }}
    >
      <div
        className="max-w-2xl w-full mx-4 rounded-lg shadow-lg border p-8"
        style={{
          background: 'var(--gradient-card)',
          borderRadius: 'var(--radius-card, 8px)',
          boxShadow: 'var(--shadow-card)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Register Your Company
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Please provide your company information to get started
          </p>
        </div>

        {registrationSuccess ? (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--border-success, #10b981)',
              color: 'var(--text-primary)'
            }}
          >
            <p className="font-medium mb-2">Company registration submitted successfully.</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Your company registration was received. The onboarding process will continue after review/verification.
            </p>
            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>Company ID:</strong> {registrationSuccess.company_id}
              </li>
              {registrationSuccess.company_name && (
                <li>
                  <strong>Company:</strong> {registrationSuccess.company_name}
                </li>
              )}
              {registrationSuccess.domain && (
                <li>
                  <strong>Domain:</strong> {registrationSuccess.domain}
                </li>
              )}
              {registrationSuccess.verification_status && (
                <li>
                  <strong>Verification status:</strong> {registrationSuccess.verification_status}
                </li>
              )}
            </ul>
          </div>
        ) : (
          <>
        {errors.submit && (
          <div
            className="mb-4 p-4 rounded-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-error)',
              color: 'var(--border-error)'
            }}
          >
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CompanyRegistrationFormFields
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />

          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Company'}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}

export default CompanyRegistrationForm;

