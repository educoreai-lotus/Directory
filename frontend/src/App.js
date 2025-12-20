import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DesignSystemProvider } from './context/DesignSystemContext';
import LandingPage from './pages/LandingPage';
import CompanyRegistrationForm from './pages/CompanyRegistrationForm';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import CompanyCSVUploadPage from './pages/CompanyCSVUploadPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import LoginPage from './pages/LoginPage';
import EnrichProfilePage from './pages/EnrichProfilePage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import Header from './components/Header';
import './App.css';

// Bot initialization component (must be inside AuthProvider)
function BotInitializer() {
  const { user, isAuthenticated } = useAuth();
  const botInitializedRef = React.useRef(false);

  useEffect(() => {
    // Only initialize if user is logged in
    if (!isAuthenticated || !user || !user.id) {
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return;
    }

    // Wait for bot script to load and initialize
    if (window.initializeEducoreBot && !botInitializedRef.current) {
      try {
        window.initializeEducoreBot({
          microservice: 'DIRECTORY',
          userId: user.id,
          token: token,
          tenantId: user.companyId || user.company_id || 'default'
        });
        botInitializedRef.current = true;
        console.log('[App] EDUCORE Bot initialized successfully');
      } catch (error) {
        console.error('[App] Error initializing EDUCORE Bot:', error);
      }
    }
  }, [user, isAuthenticated]);

  return null; // This component doesn't render anything
}

function AppContent() {
  return (
    <div className="App">
      <div className="bg-animation"></div>
      <Header />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/enrich" element={<EnrichProfilePage />} />
          <Route path="/employee/:employeeId" element={<EmployeeProfilePage />} />
          <Route path="/register" element={<CompanyRegistrationForm />} />
          <Route path="/verify/:companyId" element={<CompanyVerificationPage />} />
          <Route path="/upload/:companyId" element={<CompanyCSVUploadPage />} />
          <Route path="/company/:companyId" element={<CompanyProfilePage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>
      <BotInitializer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <DesignSystemProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </DesignSystemProvider>
    </Router>
  );
}

export default App;

