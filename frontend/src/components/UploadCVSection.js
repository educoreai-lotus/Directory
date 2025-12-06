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

      if (result?.success === true) {
        setUploaded(true);
        setError(null);
        if (onUploaded) {
          onUploaded(result);
        }
      } else {
        throw new Error(result?.message || 'Upload failed - no success response');
      }
    } catch (err) {
      console.error('[UploadCVSection] Upload error:', err);
      // PHASE_4_FIX: Check wrapped response format for error message
      const errorMessage = err.response?.data?.response?.message 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to upload CV. Please try again.';
      setError(errorMessage);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
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

      {/* PHASE_4: File Input with Button-style Label */}
      <div className="mb-4">
        <input
          type="file"
          id="cv-file-input"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploading || uploaded}
          className="hidden"
        />
        <label
          htmlFor={uploading || uploaded ? undefined : "cv-file-input"}
          className={`btn btn-secondary w-full flex items-center justify-center gap-2 ${(uploading || uploaded) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            opacity: (uploading || uploaded) ? 0.6 : 1,
            display: 'block',
            pointerEvents: (uploading || uploaded) ? 'none' : 'auto'
          }}
        >
          {uploading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span>
              Uploading...
            </>
          ) : uploaded ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              CV Uploaded
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose PDF File
            </>
          )}
        </label>
        {fileName && !uploaded && (
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
            Selected: {fileName}
          </p>
        )}
      </div>

      {/* PHASE_4: Upload Button */}
      {selectedFile && !uploaded && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn btn-primary w-full"
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

