// Frontend Component - Upload CV Section
// Handles PDF CV upload for extended enrichment flow
// PHASE_4: This component is part of the extended enrichment flow

import React, { useState } from 'react';
import { uploadCV } from '../services/enrichmentService';

function UploadCVSection({ employeeId, onUploaded }) {
  // PHASE_4: Component state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  // PHASE_4: Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a PDF file');
        setSelectedFile(null);
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);
      setError(null);
      setUploaded(false);
    }
  };

  // PHASE_4: Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !employeeId) {
      setError('Please select a PDF file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const result = await uploadCV(employeeId, selectedFile);

      if (result?.success || result?.data) {
        setUploaded(true);
        setError(null);
        if (onUploaded) {
          onUploaded(result);
        }
      } else {
        throw new Error('Upload failed - no success response');
      }
    } catch (err) {
      console.error('[UploadCVSection] Upload error:', err);
      const errorMessage = err.response?.data?.response?.error 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to upload CV. Please try again.';
      setError(errorMessage);
      setUploaded(false);
    } finally {
      setUploading(false);
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
          Upload Your CV (PDF)
        </h3>
        {uploaded && (
          <div className="flex items-center gap-2">
            <span 
              className="text-sm px-3 py-1 rounded-full flex items-center gap-2"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'rgb(34, 197, 94)'
              }}
            >
              <span className="text-green-600 font-bold">✓</span>
              CV uploaded
            </span>
          </div>
        )}
      </div>

      {/* PHASE_4: Description */}
      <p 
        className="text-sm mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Upload your CV as a PDF file. We'll extract your name, email, current role, target role, and optionally bio and projects.
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

      {/* PHASE_4: File Input */}
      <div className="mb-4">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploading || uploaded}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-teal-50 file:text-teal-700
            hover:file:bg-teal-100
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: 'var(--text-secondary)'
          }}
        />
        {fileName && !uploaded && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Selected: {fileName}
          </p>
        )}
      </div>

      {/* PHASE_4: Upload Button */}
      {selectedFile && !uploaded && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn btn-secondary w-full"
          style={{
            opacity: uploading ? 0.6 : 1,
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
              Uploading...
            </>
          ) : (
            'Upload CV'
          )}
        </button>
      )}

      {/* PHASE_4: Success Message */}
      {uploaded && (
        <div 
          className="p-3 rounded-lg"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgb(34, 197, 94)',
            color: 'rgb(34, 197, 94)'
          }}
        >
          <p className="text-sm">✓ CV uploaded successfully! Your profile will use this data for enrichment.</p>
        </div>
      )}
    </div>
  );
}

export default UploadCVSection;

