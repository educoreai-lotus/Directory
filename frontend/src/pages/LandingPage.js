import React from 'react';

function LandingPage() {
  const handleRegister = () => {
    // Navigate to company registration (to be implemented)
    console.log('Navigate to company registration');
  };

  const handleLogin = () => {
    // Navigate to login page (to be implemented)
    console.log('Navigate to login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
    }}>
      <div className="max-w-md w-full mx-4" style={{
        background: 'var(--gradient-card)',
        borderRadius: '16px',
        padding: 'var(--spacing-xl)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            EDUCORE
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Directory Management System</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <button
            onClick={handleRegister}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            REGISTER YOUR COMPANY
          </button>
          
          <div style={{ position: 'relative', margin: 'var(--spacing-sm) 0' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                width: '100%',
                borderTop: '1px solid var(--bg-tertiary)'
              }}></div>
            </div>
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <span style={{
                padding: '0 var(--spacing-sm)',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                OR
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogin}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            ALREADY REGISTERED? LOGIN
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

