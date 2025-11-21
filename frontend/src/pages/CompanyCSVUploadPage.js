// Page - Company CSV Upload
// Allows companies to upload CSV file with employee data

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CSVUploadForm from '../components/CSVUploadForm';
import CSVUploadProgress from '../components/CSVUploadProgress';
import CSVErrorDisplay from '../components/CSVErrorDisplay';
import { uploadCSV } from '../services/csvUploadService';

function CompanyCSVUploadPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setUploadResult(null);
    setError(null);
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const response = await uploadCSV(companyId, file);
      
      if (response && response.response) {
        const result = response.response;
        
        if (result.success) {
          setUploadResult({
            success: true,
            validation: result.validation,
            created: result.created,
            message: result.message
          });
          
          // Do NOT auto-redirect - user will click Continue button
        } else {
          // Validation failed - show errors
          setUploadResult({
            success: false,
            validation: result.validation,
            created: result.created,
            message: result.message
          });
        }
      } else {
        setError('Unexpected response format from server');
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      
      // Check if this is a validation error with validation data
      const errorResponse = err.response?.data?.response;
      if (errorResponse && errorResponse.validation) {
        // This is a validation error - show validation results
        setUploadResult({
          success: false,
          validation: errorResponse.validation,
          created: errorResponse.created || { departments: 0, teams: 0, employees: 0 },
          message: errorResponse.message || 'CSV validation failed. Please correct the errors below.'
        });
        setError(null); // Clear generic error
      } else {
        // This is a different type of error
        setError(
          errorResponse?.error ||
          err.message ||
          'An error occurred while uploading the CSV file. Please try again.'
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Upload Company Data
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Upload a CSV file containing your company hierarchy and employee information
          </p>
        </div>

        {/* Upload Form */}
        <CSVUploadForm
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          isUploading={isUploading}
          companyId={companyId}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 max-w-2xl mx-auto">
            <p className="text-red-800 font-medium">Upload Failed</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Success Message with Continue Button */}
        {uploadResult && uploadResult.success && (
          <div className="mt-6 p-6 rounded-lg bg-green-50 border border-green-200 max-w-2xl mx-auto">
            <p className="text-green-800 font-medium mb-2">Upload Successful!</p>
            <p className="text-green-600 text-sm mb-4">{uploadResult.message}</p>
            <button
              onClick={() => navigate(`/company/${companyId}`)}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              style={{
                background: 'var(--gradient-primary, linear-gradient(135deg, #059669, #047857))',
                color: 'var(--text-inverse, #ffffff)'
              }}
            >
              Continue to Company Profile
            </button>
          </div>
        )}

        {/* Progress and Validation Results */}
        <CSVUploadProgress
          validation={uploadResult?.validation}
          created={uploadResult?.created}
          isProcessing={isUploading}
        />

        {/* Error Display with Correction Interface */}
        {uploadResult && !uploadResult.success && uploadResult.validation && (
          <CSVErrorDisplay
            validation={uploadResult.validation}
            onCorrection={(rowNumber, corrections) => {
              console.log('Corrections for row', rowNumber, ':', corrections);
              // TODO: Implement correction handling
            }}
          />
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-lg max-w-2xl mx-auto" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            CSV File Requirements
          </h3>
          
          <div className="mb-4 p-3 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              📋 CSV Structure:
            </p>
            <ul className="text-sm mt-2 ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Row 1</strong> = Company details + company-wide settings</li>
              <li>• <strong>Row 2 and onward</strong> = Employees only (no company fields duplicated)</li>
            </ul>
          </div>

          {/* Company-Level Settings */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Row 1: Company-Level Settings (ONLY in first row)
            </h4>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              These fields must appear ONLY in row 1. Do NOT repeat them in employee rows.
            </p>
            <ul className="space-y-2 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>approval_policy</strong> (Required)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  How learning paths are approved: <code className="bg-gray-100 px-1 rounded">manual</code> or <code className="bg-gray-100 px-1 rounded">auto</code>
                  <br />
                  If set to <code className="bg-gray-100 px-1 rounded">manual</code>, your CSV must include at least one employee with <code className="bg-gray-100 px-1 rounded">DECISION_MAKER</code> role.
                  <br />
                  The DECISION_MAKER role can be combined with other roles (e.g., "REGULAR_EMPLOYEE + TRAINER + DECISION_MAKER").
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>kpis</strong> (Required - Mandatory)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Company's primary Key Performance Indicators (required for integration with Learning Analytics and Management & Reporting microservices).
                  <br />
                  Format: Semicolon-separated (e.g., "Employee Growth;Product Quality;Customer Satisfaction")
                  <br />
                  <strong>Note:</strong> Do NOT use "primary_kpis" - use only "kpis"
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>company_name</strong> (Optional)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Company name (if different from registration)
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>industry</strong> (Optional)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Company industry
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>learning_path_approval</strong> (Optional)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Alternative field name for approval_policy
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>logo_url</strong> (Optional)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Company logo URL (publicly accessible image URL).
                  <br />
                  Example: <code className="bg-gray-100 px-1 rounded">https://logo.clearbit.com/company.com</code>
                  <br />
                  If not provided, a placeholder will be shown.
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>passing_grade</strong> (Required)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Minimum passing grade for assessments (0-100). Example: 70
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>max_attempts</strong> (Required)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Maximum number of attempts allowed for assessments. Example: 3
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>exercises_limited</strong> (Required)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Whether exercises are limited (true or false). If true, num_of_exercises is also required.
                </span>
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>num_of_exercises</strong> (Required if exercises_limited is true)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Number of exercises allowed when exercises_limited is true. Example: 10
                </span>
              </li>
            </ul>
          </div>

          {/* Employee Fields */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Rows 2+: Required Employee Fields (ONLY employee fields)
            </h4>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Employee rows must contain ONLY employee-specific fields. Do NOT include company fields.
            </p>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>employee_id</strong>, <strong>full_name</strong>, <strong>email</strong>, <strong>role_type</strong></li>
              <li>• <strong>department_id</strong>, <strong>department_name</strong>, <strong>team_id</strong>, <strong>team_name</strong></li>
              <li>• <strong>manager_id</strong> (use empty string "" if no manager), <strong>password</strong></li>
              <li>• <strong>current_role_in_company</strong>, <strong>target_role_in_company</strong></li>
              <li>• <strong>preferred_language</strong>, <strong>status</strong></li>
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Trainer-Specific Fields (Only for TRAINER role)
            </h4>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• ai_enabled, public_publish_enable</li>
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Role Types (IMPORTANT)
            </h4>
            <div className="p-3 rounded mb-2" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                ⚠️ Base Role Requirement:
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Every employee must include either <strong>REGULAR_EMPLOYEE</strong> or <strong>TRAINER</strong> as the base role.
              </p>
            </div>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Base roles:</strong> REGULAR_EMPLOYEE, TRAINER (one must be present)</li>
              <li>• <strong>Additional roles:</strong> TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER</li>
              <li>• <strong>Valid examples:</strong></li>
              <li className="ml-4">- REGULAR_EMPLOYEE</li>
              <li className="ml-4">- TRAINER</li>
              <li className="ml-4">- REGULAR_EMPLOYEE + TEAM_MANAGER</li>
              <li className="ml-4">- TRAINER + DEPARTMENT_MANAGER</li>
              <li className="ml-4">- REGULAR_EMPLOYEE + DEPARTMENT_MANAGER + DECISION_MAKER</li>
              <li className="ml-4 text-red-600">❌ Invalid: TEAM_MANAGER (missing base role)</li>
              <li className="ml-4 text-red-600">❌ Invalid: DEPARTMENT_MANAGER + DECISION_MAKER (missing base role)</li>
            </ul>
          </div>

          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Maximum file size:</strong> 10MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyCSVUploadPage;

