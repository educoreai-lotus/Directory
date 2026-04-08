import React from 'react';

function AccessDeniedPage({
  title = 'Access Denied',
  message = 'You do not have permission to access this page.'
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="max-w-md w-full rounded-lg border p-6 text-center"
        style={{
          background: 'var(--gradient-card)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <button
          onClick={() => window.location.assign('/')}
          className="px-4 py-2 rounded text-sm font-medium"
          style={{
            background: 'var(--bg-button-primary)',
            color: 'var(--text-button-primary)'
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
