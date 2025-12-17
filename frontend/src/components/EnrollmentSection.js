// Component - Enrollment Section
// Allows company to enroll employees to courses via three learning flows

import React, { useState } from 'react';
import { enrollCareerPath } from '../services/enrollmentService';

function EnrollmentSection({ employees, companyId }) {
  // Always use career-path flow, show employee list directly
  const [selectedFlow] = useState('career-path'); // Fixed to career-path
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(null);

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleEnroll = async () => {
    console.log('[EnrollmentSection] handleEnroll START');
    console.log('[EnrollmentSection] Current state:', {
      selectedFlow,
      selectedEmployees,
      selectedEmployeesCount: selectedEmployees.length,
      companyId,
      enrolling
    });

    if (selectedEmployees.length === 0) {
      console.warn('[EnrollmentSection] No employees selected, showing alert');
      alert('Please select at least one employee');
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

      console.log('[EnrollmentSection] Enrolling employees:', {
        flow: selectedFlow,
        employees: selectedEmployees,
        companyId
      });

      console.log('[EnrollmentSection] Calling enrollCareerPath NOW...');
      console.log('[EnrollmentSection] enrollCareerPath function:', typeof enrollCareerPath);
      
      const result = await enrollCareerPath(companyId, selectedEmployees);
      console.log('[EnrollmentSection] enrollCareerPath returned:', result);

      if (result.success) {
        setEnrollmentSuccess(result.message || `Enrollment request sent for ${selectedEmployees.length} employee(s)`);
        // Clear selection after successful enrollment
        setTimeout(() => {
          setSelectedEmployees([]);
          setEnrollmentSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.message || 'Enrollment failed');
      }
    } catch (error) {
      console.error('[EnrollmentSection] Enrollment error caught:', error);
      console.error('[EnrollmentSection] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        response: error.response
      });
      setEnrollmentError(error.message || 'Failed to enroll employees. Please try again.');
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
              Select employees to create learning paths ({selectedEmployees.length} selected)
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center p-2 rounded hover:bg-opacity-50 cursor-pointer"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
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
                  No employees available
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
                  selectedEmployeesCount: selectedEmployees.length,
                  enrolling,
                  disabled: selectedEmployees.length === 0 || enrolling
                });
                handleEnroll();
              }}
              disabled={selectedEmployees.length === 0 || enrolling}
              className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrolling ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Creating...
                </>
              ) : (
                'Create Learning Path'
              )}
            </button>
          </div>
        </div>
    </div>
  );
}

export default EnrollmentSection;

