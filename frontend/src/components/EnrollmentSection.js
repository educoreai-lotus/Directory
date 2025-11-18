// Component - Enrollment Section
// Allows company to enroll employees to courses via three learning flows

import React, { useState } from 'react';

function EnrollmentSection({ employees, companyId }) {
  const [selectedFlow, setSelectedFlow] = useState(null); // 'career-path', 'skill-driven', 'trainer-led'
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showEmployeeList, setShowEmployeeList] = useState(false);

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

  const handleEnroll = () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    console.log('Enroll employees:', {
      flow: selectedFlow,
      employees: selectedEmployees,
      companyId
    });
    // TODO: Implement enrollment logic (will connect to Learning Analytics microservice)
    alert(`Enrolling ${selectedEmployees.length} employee(s) via ${selectedFlow} flow...`);
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

          <div className="flex gap-2">
            <button
              onClick={handleEnroll}
              disabled={selectedEmployees.length === 0}
              className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enroll Selected Employees
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

