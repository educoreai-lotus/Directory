// Component - CSV Upload Progress
// Displays upload progress and validation results

import React from 'react';

function CSVUploadProgress({ validation, created, isProcessing }) {
  if (!validation && !isProcessing) {
    return null;
  }

  if (isProcessing) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-6 p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Processing CSV file...
          </p>
        </div>
      </div>
    );
  }

  const hasErrors = validation.errors && validation.errors.length > 0;
  const hasWarnings = validation.warnings && validation.warnings.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 space-y-4">
      {/* Summary */}
      <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Upload Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Rows</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {validation.summary?.totalRows || 0}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Valid Rows</p>
            <p className="text-2xl font-bold text-green-600">
              {validation.summary?.validRows || 0}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Errors</p>
            <p className="text-2xl font-bold text-red-600">
              {validation.summary?.errorRows || 0}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">
              {validation.summary?.warningRows || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Created Records */}
      {created && (
        <div className="p-6 rounded-lg bg-green-50 border border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Successfully Created</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-green-700">Departments</p>
              <p className="text-xl font-bold text-green-800">{created.departments || 0}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Teams</p>
              <p className="text-xl font-bold text-green-800">{created.teams || 0}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Employees</p>
              <p className="text-xl font-bold text-green-800">{created.employees || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="p-6 rounded-lg bg-red-50 border border-red-200">
          <h3 className="text-lg font-semibold mb-4 text-red-800">
            Errors ({validation.errors.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {validation.errors.map((error, index) => (
              <div key={index} className="p-3 bg-white rounded border border-red-200">
                <p className="text-sm font-medium text-red-800">
                  Row {error.row}, Column: {error.column}
                </p>
                <p className="text-sm text-red-600">{error.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800">
            Warnings ({validation.warnings.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {validation.warnings.map((warning, index) => (
              <div key={index} className="p-3 bg-white rounded border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">
                  Row {warning.row}, Column: {warning.column}
                </p>
                <p className="text-sm text-yellow-600">{warning.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CSVUploadProgress;

