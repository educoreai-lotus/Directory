// Component - Enrollment Section
// Allows company to enroll employees to courses via three learning flows

import React, { useState } from 'react';
import { enrollCareerPath } from '../services/enrollmentService';

function EnrollmentSection({ employees, companyId }) {
  const [selectedFlow, setSelectedFlow] = useState(null); // 'career-path', 'skill-driven', 'trainer-led'
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(null);

  const handleFlowSelect = (flow) => {
    setSelectedFlow(flow);
    setShowEmployeeList(true);
    setSelectedEmployees([]);
  };

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
      enrolling,
      showEmployeeList
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

  const getFlowDescription = (flow) => {
    const descriptions = {
      'career-path': 'Enroll employees based on their career progression path (current role → target role)',
      'skill-driven': 'Enroll employees based on specific skills they need to learn',
      'trainer-led': 'Enroll employees to courses taught by trainers in your company'
    };
    return descriptions[flow] || '';
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Enroll Employees to Courses
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Select a learning flow and choose employees to enroll
        </p>
      </div>

      {/* Learning Flow Selection */}
      {!showEmployeeList && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-6 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)'
            }}
            onClick={() => handleFlowSelect('career-path')}
          >
            <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Career-Path-Driven Learning
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {getFlowDescription('career-path')}
            </p>
          </div>

          <div
            className="p-6 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)'
            }}
            onClick={() => handleFlowSelect('skill-driven')}
          >
            <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Skill-Driven Learning
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {getFlowDescription('skill-driven')}
            </p>
          </div>

          <div
            className="p-6 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)'
            }}
            onClick={() => handleFlowSelect('trainer-led')}
          >
            <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Trainer-Led Learning
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {getFlowDescription('trainer-led')}
            </p>
          </div>
        </div>
      )}

      {/* Employee Selection */}
      {showEmployeeList && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Selected Flow: {selectedFlow?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {getFlowDescription(selectedFlow)}
              </p>
            </div>
            <button
              onClick={() => {
                setShowEmployeeList(false);
                setSelectedFlow(null);
                setSelectedEmployees([]);
              }}
              className="px-4 py-2 border rounded hover:bg-opacity-50 transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              Change Flow
            </button>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Select employees to enroll ({selectedEmployees.length} selected)
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
                  Enrolling...
                </>
              ) : (
                'Enroll Selected Employees'
              )}
            </button>
            <button
              onClick={() => {
                setShowEmployeeList(false);
                setSelectedFlow(null);
                setSelectedEmployees([]);
              }}
              className="px-6 py-2 border rounded hover:bg-opacity-50 transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnrollmentSection;

