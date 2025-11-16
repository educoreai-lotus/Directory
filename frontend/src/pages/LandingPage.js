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
    <div className="min-h-screen flex items-center justify-center relative bg-body" style={{
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.05) 0%, transparent 50%)'
    }}>
      <div className="max-w-md w-full mx-4 bg-gradient-card rounded-card shadow-card border border-border-default p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 font-display bg-gradient-primary bg-clip-text text-transparent">
            EDUCORE
          </h1>
          <p className="text-sm text-text-secondary">Directory Management System</p>
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
              <div className="w-full border-t border-border-default"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-bg-card text-text-muted text-sm">
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

