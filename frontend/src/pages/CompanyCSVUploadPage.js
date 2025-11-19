// Page - Company CSV Upload
// Allows companies to upload CSV file with employee data

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CSVUploadForm from '../components/CSVUploadForm';
import CSVUploadProgress from '../components/CSVUploadProgress';
import CSVErrorDisplay from '../components/CSVErrorDisplay';
import CSVCorrectionForm from '../components/CSVCorrectionForm';
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
          <>
            <CSVErrorDisplay
              validation={uploadResult.validation}
              onCorrection={(rowNumber, corrections) => {
                console.log('Corrections for row', rowNumber, ':', corrections);
                // TODO: Implement correction handling
              }}
            />
            <CSVCorrectionForm
              validation={uploadResult.validation}
              onResubmit={async (corrections) => {
                console.log('Resubmitting with corrections:', corrections);
                // TODO: Implement resubmit with corrections
              }}
              onCancel={() => {
                setUploadResult(null);
                setSelectedFile(null);
              }}
            />
          </>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-lg max-w-2xl mx-auto" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            CSV File Requirements
          </h3>
          
          {/* Company-Level Settings */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Company-Level Settings (from first row only)
            </h4>
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
                <strong style={{ color: 'var(--text-primary)' }}>KPIs</strong> (Required - Mandatory)
                <br />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Company's primary Key Performance Indicators (required for integration with Learning Analytics and Management & Reporting microservices).
                  <br />
                  Format: Semicolon-separated (e.g., "Employee Growth;Product Quality;Customer Satisfaction")
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
            </ul>
          </div>

          {/* Employee Fields */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Required Employee Fields
            </h4>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• employee_id, full_name, email, role_type, department_id, department_name, team_id, team_name</li>
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              Optional Employee Fields
            </h4>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• manager_id, password, preferred_language, status, current_role_in_company, target_role_in_company</li>
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
              Role Types
            </h4>
            <ul className="space-y-1 text-sm ml-4" style={{ color: 'var(--text-secondary)' }}>
              <li>• REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER</li>
              <li>• Roles can be combined (e.g., "REGULAR_EMPLOYEE + TEAM_MANAGER + DECISION_MAKER")</li>
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

