// Component - Admin Header
// Displays admin name, email, and logout button

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function AdminHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header 
      className="w-full border-b mb-6"
      style={{ 
        borderColor: 'var(--border-default)',
        background: 'var(--bg-primary)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Directory Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.fullName || 'Admin'}
            </p>
            <p 
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-button-secondary)',
              color: 'var(--text-button-secondary)',
              border: '1px solid var(--border-default)'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;

