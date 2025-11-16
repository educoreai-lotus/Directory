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
    <div 
      className="min-h-screen flex items-center justify-center relative" 
      style={{
        background: 'var(--bg-body, var(--bg-primary))',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
      }}
    >
      <div 
        className="max-w-md w-full mx-4 rounded-lg shadow-lg border p-8"
        style={{
          background: 'var(--gradient-card)',
          borderRadius: 'var(--radius-card, 8px)',
          boxShadow: 'var(--shadow-card)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            EDUCORE
          </h1>
          <p 
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Directory Management System
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={handleRegister}
            className="btn btn-primary w-full"
          >
            REGISTER YOUR COMPANY
          </button>
          
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div 
                className="w-full border-t"
                style={{ borderColor: 'var(--border-default)' }}
              ></div>
            </div>
            <div className="relative flex justify-center">
              <span 
                className="px-2 text-sm"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)'
                }}
              >
                OR
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogin}
            className="btn btn-secondary w-full"
          >
            ALREADY REGISTERED? LOGIN
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

