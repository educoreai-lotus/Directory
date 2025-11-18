// Component - Edit Employee Form
// Form for editing existing employees

import React, { useState, useEffect } from 'react';

function EditEmployeeForm({ employee, departments, teams, employees, onSave, onCancel, companyId }) {
  const [formData, setFormData] = useState({
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    role_type: employee?.roles?.join(' + ') || 'REGULAR_EMPLOYEE',
    department_id: '',
    department_name: '',
    team_id: '',
    team_name: '',
    manager_id: '',
    preferred_language: employee?.preferred_language || '',
    status: employee?.status || 'active',
    current_role_in_company: employee?.current_role_in_company || '',
    target_role_in_company: employee?.target_role_in_company || '',
    // Trainer-specific fields
    ai_enabled: false,
    public_publish_enable: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Set initial department and team from employee's teams
    if (employee?.teams && employee.teams.length > 0) {
      const team = teams?.find(t => t.id === employee.teams[0].id);
      if (team) {
        setFormData(prev => ({
          ...prev,
          team_id: team.team_id,
          team_name: team.team_name,
          department_id: team.department_id ? departments?.find(d => d.id === team.department_id)?.department_id : ''
        }));
      }
    }
  }, [employee, teams, departments]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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
      console.error('Error updating employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTrainer = formData.role_type.includes('TRAINER');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
            Role Type
          </label>
          <select
            name="role_type"
            value={formData.role_type}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Department
          </label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleDepartmentChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Team
          </label>
          <select
            name="team_id"
            value={formData.team_id}
            onChange={handleTeamChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Manager ID
          </label>
          <select
            name="manager_id"
            value={formData.manager_id}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">No Manager</option>
            {employees?.filter(emp => emp.id !== employee?.id).map(emp => (
              <option key={emp.id} value={emp.employee_id}>
                {emp.full_name} ({emp.employee_id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Current Role in Company
          </label>
          <input
            type="text"
            name="current_role_in_company"
            value={formData.current_role_in_company}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Target Role in Company
          </label>
          <input
            type="text"
            name="target_role_in_company"
            value={formData.target_role_in_company}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Preferred Language
          </label>
          <input
            type="text"
            name="preferred_language"
            value={formData.preferred_language}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

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
          {isSubmitting ? 'Saving...' : 'Save Changes'}
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

export default EditEmployeeForm;

