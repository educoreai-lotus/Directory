// Component - Company Metrics
// Displays company dashboard metrics

import React from 'react';

function CompanyMetrics({ metrics }) {
  if (!metrics) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Employees</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
          {metrics.totalEmployees || 0}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {metrics.activeEmployees || 0} active
        </p>
      </div>

      <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Departments</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
          {metrics.totalDepartments || 0}
        </p>
      </div>

      <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Teams</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
          {metrics.totalTeams || 0}
        </p>
      </div>

    </div>
  );
}

export default CompanyMetrics;

