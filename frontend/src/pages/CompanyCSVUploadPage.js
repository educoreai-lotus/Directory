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
          
          {/* 1. File Structure */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              1. File Structure
            </h4>
            <ul className="text-sm ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Row 1</strong> → Company settings</li>
              <li>• <strong>Rows 2+</strong> → Employees only</li>
            </ul>
          </div>

          {/* 2. Column Order */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              2. Column Order
            </h4>
            <div className="p-3 rounded text-xs font-mono" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', overflowX: 'auto' }}>
              company_name, industry, logo_url, approval_policy, kpis, passing_grade, max_attempts, exercises_limited, num_of_exercises, learning_path_approval, employee_id, full_name, email, role_type, department_id, department_name, team_id, team_name, manager_id, password, current_role_in_company, target_role_in_company, preferred_language, status, ai_enabled, public_publish_enable
            </div>
          </div>

          {/* 3. Row 1 – Company Settings */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              3. Row 1 – Company Settings
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>company_name</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>industry</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>logo_url</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>approval_policy <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(manual / auto)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>kpis <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(split by ;)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>passing_grade <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(0–100)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>max_attempts</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>exercises_limited <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(true/false)</span></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>num_of_exercises <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(when exercises_limited = true)</span></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>learning_path_approval</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              <strong>Note:</strong> if approval_policy = manual → state one DECISION_MAKER
            </p>
          </div>

          {/* 4. Rows 2+ – Employee Records */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              4. Rows 2+ – Employee Records (Mandatory per employee)
            </h4>
            <div className="mb-3">
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Required:</p>
              <ul className="text-sm ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• employee_id</li>
                <li>• full_name</li>
                <li>• email</li>
                <li>• role_type</li>
                <li>• department_id, department_name</li>
                <li>• team_id, team_name</li>
                <li>• manager_id <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(could be empty)</span></li>
                <li>• password</li>
                <li>• current_role_in_company</li>
                <li>• target_role_in_company</li>
                <li>• preferred_language</li>
                <li>• status</li>
              </ul>
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Only for TRAINERS:</p>
              <ul className="text-sm ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• ai_enabled</li>
                <li>• public_publish_enable</li>
              </ul>
            </div>
          </div>

          {/* 5. Role Rules */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              5. Role Rules (Short & Important)
            </h4>
            <div className="mb-3">
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <strong>BASE ROLE:</strong>
              </p>
              <ul className="text-sm ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• REGULAR_EMPLOYEE or TRAINER</li>
              </ul>
              <p className="text-sm mt-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                <strong>Addition:</strong> TEAM_MANAGER / DEPARTMENT_MANAGER / DECISION_MAKER
              </p>
            </div>
            <div className="mb-2">
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <strong>✅ Valid:</strong>
              </p>
              <ul className="text-sm ml-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• REGULAR_EMPLOYEE</li>
                <li>• TRAINER</li>
                <li>• REGULAR_EMPLOYEE + TEAM_MANAGER</li>
                <li>• REGULAR_EMPLOYEE + DEPARTMENT_MANAGER + DECISION_MAKER</li>
              </ul>
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <strong>❌ Not valid:</strong>
              </p>
              <ul className="text-sm ml-4 space-y-1" style={{ color: 'rgb(239, 68, 68)' }}>
                <li>• TEAM_MANAGER</li>
                <li>• DEPARTMENT_MANAGER + DECISION_MAKER</li>
              </ul>
            </div>
          </div>

          {/* 6. File Size */}
          <div>
            <h4 className="font-semibold mb-2 text-base" style={{ color: 'var(--text-primary)' }}>
              6. File Size
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>MAX 10MB</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyCSVUploadPage;

