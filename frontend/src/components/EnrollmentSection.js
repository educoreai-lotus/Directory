// Component - Enrollment Section
// Allows company to enroll employees to courses via three learning flows

import React, { useState } from 'react';
import { enrollCareerPath } from '../services/enrollmentService';

function EnrollmentSection({ employees, companyId }) {
  // Always use career-path flow, show employee list directly
  const [selectedFlow] = useState('career-path'); // Fixed to career-path
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Single selection only
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(null);

  // Filter employees to only show approved profiles
  const approvedEmployees = employees ? employees.filter(emp => emp.profile_status === 'approved') : [];

  const handleEmployeeSelect = (employeeId) => {
    // Single selection - if same employee clicked, deselect; otherwise select new one
    setSelectedEmployee(selectedEmployee === employeeId ? null : employeeId);
  };

  const handleEnroll = async () => {
    console.log('[EnrollmentSection] handleEnroll START');
    console.log('[EnrollmentSection] Current state:', {
      selectedFlow,
      selectedEmployee,
      companyId,
      enrolling
    });

    if (!selectedEmployee) {
      console.warn('[EnrollmentSection] No employee selected, showing alert');
      alert('Please select an employee');
      return;
    }

    // Only implement career-path flow for now
    if (selectedFlow !== 'career-path') {
      console.warn('[EnrollmentSection] Wrong flow selected:', selectedFlow);
      alert(`${selectedFlow} enrollment is not yet implemented`);
      return;
    }

    console.log('[EnrollmentSection] Validation passed, proceeding with enrollment');

    try {
      console.log('[EnrollmentSection] Setting enrolling state to true');
      setEnrolling(true);
      setEnrollmentError(null);
      setEnrollmentSuccess(null);

      console.log('[EnrollmentSection] Creating career path for employee:', {
        flow: selectedFlow,
        employee: selectedEmployee,
        companyId
      });

      console.log('[EnrollmentSection] Calling enrollCareerPath NOW...');
      console.log('[EnrollmentSection] enrollCareerPath function:', typeof enrollCareerPath);
      
      // Pass as array with single employee
      const result = await enrollCareerPath(companyId, [selectedEmployee]);
      console.log('[EnrollmentSection] enrollCareerPath returned:', result);

      if (result.success) {
        setEnrollmentSuccess(result.message || 'Career path creation request sent successfully');
        // Clear selection after successful enrollment
        setTimeout(() => {
          setSelectedEmployee(null);
          setEnrollmentSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.message || 'Career path creation failed');
      }
    } catch (error) {
      console.error('[EnrollmentSection] Enrollment error caught:', error);
      console.error('[EnrollmentSection] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        response: error.response
      });
      setEnrollmentError(error.message || 'Failed to create career path. Please try again.');
    } finally {
      console.log('[EnrollmentSection] handleEnroll FINALLY block - setting enrolling to false');
      setEnrolling(false);
      console.log('[EnrollmentSection] handleEnroll END');
    }
  };


  return (
    <div className="space-y-6">
      {/* Employee Selection - Show directly, no flow selection */}
      <div className="space-y-4">

          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Select an employee to create career path {selectedEmployee ? '(1 selected)' : '(0 selected)'}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Only employees with approved profiles are shown
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {approvedEmployees && approvedEmployees.length > 0 ? (
                approvedEmployees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center p-2 rounded hover:bg-opacity-50 cursor-pointer"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <input
                      type="radio"
                      name="employee-selection"
                      checked={selectedEmployee === employee.id}
                      onChange={() => handleEmployeeSelect(employee.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {employee.full_name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {employee.email} • {employee.current_role_in_company || 'No role specified'}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                  No approved employees available. Employees must have enriched and approved profiles to create career paths.
                </p>
              )}
            </div>
          </div>

          {/* Success Message */}
          {enrollmentSuccess && (
            <div 
              className="p-3 rounded-lg mb-4"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgb(34, 197, 94)',
                color: 'rgb(34, 197, 94)'
              }}
            >
              <p className="text-sm">{enrollmentSuccess}</p>
            </div>
          )}

          {/* Error Message */}
          {enrollmentError && (
            <div 
              className="p-3 rounded-lg mb-4"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--border-error)',
                color: 'var(--text-error)'
              }}
            >
              <p className="text-sm">{enrollmentError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                console.log('[EnrollmentSection] Button clicked!', {
                  selectedFlow,
                  selectedEmployee,
                  enrolling,
                  disabled: !selectedEmployee || enrolling
                });
                handleEnroll();
              }}
              disabled={!selectedEmployee || enrolling}
              className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrolling ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Creating...
                </>
              ) : (
                'Create Career Path'
              )}
            </button>
          </div>
        </div>
    </div>
  );
}

export default EnrollmentSection;

