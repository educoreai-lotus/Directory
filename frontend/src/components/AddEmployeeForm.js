// Component - Add Employee Form
// Form for adding new employees (same fields as CSV upload)

import React, { useState } from 'react';

function AddEmployeeForm({ departments, teams, employees, onSave, onCancel, companyId }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    role_type: 'REGULAR_EMPLOYEE',
    department_id: '',
    department_name: '',
    team_id: '',
    team_name: '',
    manager_id: '',
    preferred_language: '',
    status: 'active',
    current_role_in_company: '',
    target_role_in_company: '',
    password: '',
    // Trainer-specific fields
    ai_enabled: false,
    public_publish_enable: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    const department = departments?.find(d => d.department_id === deptId);
    setFormData(prev => ({
      ...prev,
      department_id: deptId,
      department_name: department?.department_name || ''
    }));
  };

  const handleTeamChange = (e) => {
    const teamId = e.target.value;
    const team = teams?.find(t => t.team_id === teamId);
    setFormData(prev => ({
      ...prev,
      team_id: teamId,
      team_name: team?.team_name || ''
    }));
  };

  const validate = () => {
    const newErrors = {};

    // Required fields
    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.role_type) {
      newErrors.role_type = 'Role type is required';
    }
    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
    }
    if (!formData.team_id) {
      newErrors.team_id = 'Team is required';
    }
    
    // Additional required fields
    if (formData.manager_id === null || formData.manager_id === undefined) {
      newErrors.manager_id = 'Manager ID is required (use empty string "" if no manager)';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    if (!formData.preferred_language.trim()) {
      newErrors.preferred_language = 'Preferred language is required';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    if (!formData.current_role_in_company.trim()) {
      newErrors.current_role_in_company = 'Current role in company is required';
    }
    if (!formData.target_role_in_company.trim()) {
      newErrors.target_role_in_company = 'Target role in company is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTrainer = formData.role_type.includes('TRAINER');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Required Fields */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Employee ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.employee_id ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.full_name ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.email ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Role Type <span className="text-red-500">*</span>
          </label>
          <select
            name="role_type"
            value={formData.role_type}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.role_type ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="REGULAR_EMPLOYEE">REGULAR_EMPLOYEE</option>
            <option value="REGULAR_EMPLOYEE + TEAM_MANAGER">REGULAR_EMPLOYEE + TEAM_MANAGER</option>
            <option value="REGULAR_EMPLOYEE + DEPARTMENT_MANAGER">REGULAR_EMPLOYEE + DEPARTMENT_MANAGER</option>
            <option value="TRAINER">TRAINER</option>
            <option value="TRAINER + TEAM_MANAGER">TRAINER + TEAM_MANAGER</option>
            <option value="TRAINER + DEPARTMENT_MANAGER">TRAINER + DEPARTMENT_MANAGER</option>
            <option value="DECISION_MAKER">DECISION_MAKER</option>
          </select>
          {errors.role_type && <p className="text-xs text-red-500 mt-1">{errors.role_type}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Department <span className="text-red-500">*</span>
          </label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleDepartmentChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.department_id ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Select Department</option>
            {departments?.map(dept => (
              <option key={dept.id} value={dept.department_id}>
                {dept.department_name}
              </option>
            ))}
          </select>
          {errors.department_id && <p className="text-xs text-red-500 mt-1">{errors.department_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Team <span className="text-red-500">*</span>
          </label>
          <select
            name="team_id"
            value={formData.team_id}
            onChange={handleTeamChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.team_id ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Select Team</option>
            {teams?.map(team => (
              <option key={team.id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
          {errors.team_id && <p className="text-xs text-red-500 mt-1">{errors.team_id}</p>}
        </div>

        {/* Required Fields - Manager ID */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Manager ID <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2">(Select "No Manager" if none)</span>
          </label>
          <select
            name="manager_id"
            value={formData.manager_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.manager_id ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">No Manager (Empty String)</option>
            {employees?.map(emp => (
              <option key={emp.id} value={emp.employee_id}>
                {emp.full_name} ({emp.employee_id})
              </option>
            ))}
          </select>
          {errors.manager_id && <p className="text-xs text-red-500 mt-1">{errors.manager_id}</p>}
        </div>

        {/* Required Fields - Status */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Status <span className="text-red-500">*</span>
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.status ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
        </div>

        {/* Required Fields - Current Role */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Current Role in Company <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="current_role_in_company"
            value={formData.current_role_in_company}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.current_role_in_company ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
            placeholder="e.g., Frontend Developer"
          />
          {errors.current_role_in_company && <p className="text-xs text-red-500 mt-1">{errors.current_role_in_company}</p>}
        </div>

        {/* Required Fields - Target Role */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Target Role in Company <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="target_role_in_company"
            value={formData.target_role_in_company}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.target_role_in_company ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
            placeholder="e.g., Senior Frontend Developer"
          />
          {errors.target_role_in_company && <p className="text-xs text-red-500 mt-1">{errors.target_role_in_company}</p>}
        </div>

        {/* Required Fields - Preferred Language */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Preferred Language <span className="text-red-500">*</span>
          </label>
          <select
            name="preferred_language"
            value={formData.preferred_language}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.preferred_language ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Select Language</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
          </select>
          {errors.preferred_language && <p className="text-xs text-red-500 mt-1">{errors.preferred_language}</p>}
        </div>

        {/* Required Fields - Password */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: errors.password ? 'red' : 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
            placeholder="Enter password"
          />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>
      </div>

      {/* Trainer-Specific Fields */}
      {isTrainer && (
        <div className="border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
          <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Trainer Settings
          </h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="ai_enabled"
                checked={formData.ai_enabled}
                onChange={handleChange}
                className="mr-2"
              />
              <span style={{ color: 'var(--text-primary)' }}>AI Enabled</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="public_publish_enable"
                checked={formData.public_publish_enable}
                onChange={handleChange}
                className="mr-2"
              />
              <span style={{ color: 'var(--text-primary)' }}>Public Publish Enable</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Add Employee'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border rounded hover:bg-opacity-50 transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddEmployeeForm;

