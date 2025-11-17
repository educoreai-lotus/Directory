// Page - Company CSV Upload
// Allows companies to upload CSV file with employee data

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CSVUploadForm from '../components/CSVUploadForm';
import CSVUploadProgress from '../components/CSVUploadProgress';
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
          
          // Redirect to company profile page after successful upload
          // For now, we'll show success message and allow manual navigation
          setTimeout(() => {
            // Navigate to company profile (F005 - to be implemented)
            // navigate(`/company/${companyId}`);
          }, 3000);
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
      setError(
        err.response?.data?.response?.error ||
        err.message ||
        'An error occurred while uploading the CSV file. Please try again.'
      );
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

        {/* Success Message */}
        {uploadResult && uploadResult.success && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200 max-w-2xl mx-auto">
            <p className="text-green-800 font-medium">Upload Successful!</p>
            <p className="text-green-600 text-sm mt-1">{uploadResult.message}</p>
          </div>
        )}

        {/* Progress and Validation Results */}
        <CSVUploadProgress
          validation={uploadResult?.validation}
          created={uploadResult?.created}
          isProcessing={isUploading}
        />

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-lg max-w-2xl mx-auto" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            CSV File Requirements
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>• Required fields: employee_id, full_name, email, role_type, department_id, department_name, team_id, team_name</li>
            <li>• Optional fields: manager_id, password, preferred_language, status</li>
            <li>• Trainer-specific fields: ai_enabled, public_publish_enable</li>
            <li>• Role types: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER</li>
            <li>• Roles can be combined (e.g., "REGULAR_EMPLOYEE + TEAM_MANAGER")</li>
            <li>• Maximum file size: 10MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CompanyCSVUploadPage;

