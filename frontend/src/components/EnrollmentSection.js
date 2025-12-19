// Component - Enrollment Section
// Allows company to create career paths for employees by redirecting to Skills Engine frontend

import React, { useState } from 'react';

function EnrollmentSection({ employees, companyId }) {
  // Always use career-path flow, show employee list directly
  const [selectedFlow] = useState('career-path'); // Fixed to career-path
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Single selection only

  // Filter employees to only show approved profiles
  const approvedEmployees = employees ? employees.filter(emp => emp.profile_status === 'approved') : [];

  const handleEmployeeSelect = (employeeId) => {
    // Single selection - if same employee clicked, deselect; otherwise select new one
    setSelectedEmployee(selectedEmployee === employeeId ? null : employeeId);
  };

  const handleEnroll = () => {
    console.log('[EnrollmentSection] handleEnroll START');
    console.log('[EnrollmentSection] Current state:', {
      selectedFlow,
      selectedEmployee,
      companyId
    });

    if (!selectedEmployee) {
      console.warn('[EnrollmentSection] No employee selected, showing alert');
      alert('Please select an employee');
      return;
    }

    if (!companyId) {
      console.error('[EnrollmentSection] Cannot redirect: Company ID is missing');
      alert('Error: Company ID not found. Please try again.');
      return;
    }

    // Redirect to Skills Engine frontend with company_id and learner_id
    const skillsEngineUrl = process.env.REACT_APP_SKILLS_ENGINE_URL || 'https://skills-engine-frontend.vercel.app/career-path';
    const url = `${skillsEngineUrl}?company_id=${encodeURIComponent(companyId)}&learner_id=${encodeURIComponent(selectedEmployee)}`;
    
    console.log('[EnrollmentSection] Redirecting to Skills Engine:', url);
    console.log('[EnrollmentSection] Company ID:', companyId);
    console.log('[EnrollmentSection] Learner ID (Employee ID):', selectedEmployee);
    
    window.location.href = url;
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

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                console.log('[EnrollmentSection] Button clicked!', {
                  selectedFlow,
                  selectedEmployee,
                  companyId
                });
                handleEnroll();
              }}
              disabled={!selectedEmployee}
              className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Career Path
            </button>
          </div>
        </div>
    </div>
  );
}

export default EnrollmentSection;

