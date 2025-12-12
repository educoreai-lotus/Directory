// Component - CSV Upload Form
// Handles file selection and upload

import React, { useState } from 'react';

function CSVUploadForm({ onFileSelect, onUpload, isUploading, companyId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Please select a CSV file');
        e.target.value = '';
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Please drop a CSV file');
      }
    }
  };

  const handleUpload = () => {
    // Prevent duplicate uploads
    if (!selectedFile || isUploading) {
      if (!selectedFile) {
        console.log('[CSVUploadForm] No file selected, ignoring upload');
      }
      if (isUploading) {
        console.log('[CSVUploadForm] Upload already in progress, ignoring duplicate call');
      }
      return;
    }
    
    // Verify file still exists before uploading
    if (!selectedFile || !(selectedFile instanceof File)) {
      console.error('[CSVUploadForm] File reference is invalid:', selectedFile);
      alert('File reference lost. Please select the file again.');
      return;
    }
    
    console.log('[CSVUploadForm] Uploading file:', selectedFile.name, 'Size:', selectedFile.size);
    onUpload(selectedFile);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive
            ? 'border-teal-500 bg-teal-50'
            : 'border-gray-300 hover:border-teal-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          background: dragActive ? 'var(--bg-card)' : 'var(--bg-card)',
          borderColor: dragActive ? 'var(--border-focus)' : 'var(--border-default)'
        }}
      >
        <input
          type="file"
          id="csvFile"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="csvFile"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-16 h-16 mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            CSV file only (max 10MB)
          </p>
        </label>
      </div>

      {selectedFile && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload CSV File'}
          </button>
        </div>
      )}
    </div>
  );
}

export default CSVUploadForm;

