// Component - Employee List
// Displays list of all company employees with Add/Edit/Delete functionality

import React, { useState, useMemo } from 'react';
import AddEmployeeForm from './AddEmployeeForm';
import EditEmployeeForm from './EditEmployeeForm';
import CSVUploadForm from './CSVUploadForm';

function EmployeeList({ employees, onEmployeeClick, companyId, departments, teams, isAdminView = false }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  
  // Filter, sort, and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [roleFilter, setRoleFilter] = useState('all'); // Single-select role filter

  // Filter and sort employees - Must be called before any conditional returns (React Hooks rule)
  const filteredAndSortedEmployees = useMemo(() => {
    if (!employees) return [];

    let filtered = [...employees];

    // Apply search filter (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.full_name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter (single-select)
    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => {
        if (!emp.roles || !Array.isArray(emp.roles)) return false;
        // Check if employee has the selected role
        return emp.roles.includes(roleFilter);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      // Handle nested fields (e.g., roles)
      if (sortField === 'roles' && Array.isArray(aValue)) {
        aValue = aValue.join(', ');
      }
      if (sortField === 'roles' && Array.isArray(bValue)) {
        bValue = bValue.join(', ');
      }

      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [employees, searchQuery, sortField, sortDirection, roleFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (showCSVUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Upload Employees CSV
          </h3>
          <button
            onClick={() => setShowCSVUpload(false)}
            className="px-4 py-2 border rounded hover:bg-opacity-50 transition-colors"
            style={{ 
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            Cancel
          </button>
        </div>
        <div className="p-6 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload a CSV file with new employees. The CSV should follow the same format as the initial company upload.
          </p>
          <CSVUploadForm
            onFileSelect={(file) => console.log('File selected:', file)}
            onUpload={async (file) => {
              try {
                const { uploadCSV } = await import('../services/csvUploadService');
                await uploadCSV(companyId, file);
                alert('Employees uploaded successfully!');
                window.location.reload();
              } catch (error) {
                console.error('CSV upload error:', error);
                alert(error.response?.data?.response?.error || error.message || 'Failed to upload CSV');
              }
            }}
            isUploading={false}
            companyId={companyId}
          />
        </div>
      </div>
    );
  }

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
      // Show success message briefly before reload
      alert('Employee added successfully!');
      setShowAddForm(false);
      // Refresh the employee list
      window.location.reload();
    } catch (error) {
      console.error('Error adding employee:', error);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.response?.error 
        || error.message 
        || 'Failed to add employee';
      alert(errorMessage);
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
          {!isAdminView && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
            >
              + Add Employee
            </button>
          )}
        </div>
        <div className="p-6 rounded-lg text-center" style={{ background: 'var(--bg-card)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No employees found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          All Employees ({filteredAndSortedEmployees.length} of {employees?.length || 0})
        </h3>
        
        {/* Add Employee Button with Dropdown - Hidden in admin view */}
        {!isAdminView && (
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors flex items-center gap-2"
              style={{
                background: 'var(--gradient-primary, linear-gradient(135deg, #059669, #047857))',
                color: 'var(--text-inverse, #ffffff)'
              }}
            >
              + Add Employee
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAddMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowAddMenu(false)}
                />
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20"
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-default, #e2e8f0)',
                    boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))'
                  }}
                >
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setShowAddMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors"
                    style={{ 
                      color: 'var(--text-primary)',
                      background: 'var(--bg-primary)'
                    }}
                  >
                    Manual Entry
                  </button>
                  <button
                    onClick={() => {
                      setShowCSVUpload(true);
                      setShowAddMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors border-t"
                    style={{ 
                      color: 'var(--text-primary)',
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    Upload CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            style={{
              borderColor: 'var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Role Filter - Single Select Dropdown */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border rounded min-w-[180px]"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            height: '42px'
          }}
        >
          <option value="all">All Roles</option>
          <option value="REGULAR_EMPLOYEE">Regular Employees</option>
          <option value="TRAINER">Trainers</option>
          <option value="TEAM_MANAGER">Team Managers</option>
          <option value="DEPARTMENT_MANAGER">Department Managers</option>
          <option value="DECISION_MAKER">Decision Maker</option>
        </select>

        {/* Sort Field */}
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          className="px-3 py-2 border rounded"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            height: '42px'
          }}
        >
          <option value="full_name">Sort by Name</option>
          <option value="email">Sort by Email</option>
          <option value="current_role_in_company">Sort by Role</option>
          <option value="status">Sort by Status</option>
        </select>

        {/* Sort Direction Toggle */}
        <button
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="px-3 py-2 border rounded hover:bg-opacity-50 transition-colors flex items-center justify-center"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            height: '42px',
            width: '42px'
          }}
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
              <th 
              className="text-left p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors" 
              style={{ color: 'var(--text-primary)' }}
              onClick={() => handleSort('full_name')}
            >
              Name {sortField === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors" 
                style={{ color: 'var(--text-primary)' }}
                onClick={() => handleSort('email')}
              >
                Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Roles</th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors" 
                style={{ color: 'var(--text-primary)' }}
                onClick={() => handleSort('current_role_in_company')}
              >
                Current Role {sortField === 'current_role_in_company' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors" 
                style={{ color: 'var(--text-primary)' }}
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {searchQuery || roleFilter !== 'all' 
                    ? 'No employees match your filters' 
                    : 'No employees found'}
                </td>
              </tr>
            ) : (
              filteredAndSortedEmployees.map((employee) => (
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
                    {!isAdminView && (
                      <>
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
                      </>
                    )}
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeList;

