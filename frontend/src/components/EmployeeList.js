// Component - Employee List
// Displays list of all company employees with Add/Edit/Delete functionality

import React, { useState } from 'react';
import AddEmployeeForm from './AddEmployeeForm';
import EditEmployeeForm from './EditEmployeeForm';

function EmployeeList({ employees, onEmployeeClick, companyId, departments, teams }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add New Employee
          </h3>
        </div>
        <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <AddEmployeeForm
            departments={departments}
            teams={teams}
            employees={employees}
            onSave={handleAddEmployee}
            onCancel={() => setShowAddForm(false)}
            companyId={companyId}
          />
        </div>
      </div>
    );
  }

  if (editingEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit Employee
          </h3>
        </div>
        <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <EditEmployeeForm
            employee={editingEmployee}
            departments={departments}
            teams={teams}
            employees={employees}
            onSave={(data) => handleEditEmployee(editingEmployee.id, data)}
            onCancel={() => setEditingEmployee(null)}
            companyId={companyId}
          />
        </div>
      </div>
    );
  }

  const handleAddEmployee = async (employeeData) => {
    try {
      const { addEmployee } = await import('../services/employeeService');
      await addEmployee(companyId, employeeData);
      setShowAddForm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error.response?.data?.response?.error || error.message || 'Failed to add employee');
    }
  };

  const handleEditEmployee = async (employeeId, employeeData) => {
    try {
      const { updateEmployee } = await import('../services/employeeService');
      await updateEmployee(companyId, employeeId, employeeData);
      setEditingEmployee(null);
      window.location.reload();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error.response?.data?.response?.error || error.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee? This will mark them as inactive.')) {
      return;
    }
    try {
      const { deleteEmployee } = await import('../services/employeeService');
      await deleteEmployee(companyId, employeeId);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.response?.error || error.message || 'Failed to delete employee');
    }
  };

  if (!employees || employees.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            All Employees (0)
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
          >
            + Add Employee
          </button>
        </div>
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No employees found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          All Employees ({employees?.length || 0})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
        >
          + Add Employee
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Email</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Roles</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Current Role</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-opacity-50 transition-colors"
                style={{ 
                  borderBottom: '1px solid var(--border-default)',
                  background: 'var(--bg-card)'
                }}
              >
                <td 
                  className="p-3 cursor-pointer" 
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => onEmployeeClick && onEmployeeClick(employee)}
                >
                  {employee.full_name}
                </td>
                <td 
                  className="p-3 cursor-pointer" 
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => onEmployeeClick && onEmployeeClick(employee)}
                >
                  {employee.email}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {employee.roles && employee.roles.length > 0 ? (
                      employee.roles.map((role, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)'
                          }}
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No roles</span>
                    )}
                  </div>
                </td>
                <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                  {employee.current_role_in_company || '-'}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {employee.status || 'active'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEmployeeClick && onEmployeeClick(employee)}
                      className="px-2 py-1 text-xs border rounded hover:bg-opacity-50 transition-colors"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => setEditingEmployee(employee)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeList;

