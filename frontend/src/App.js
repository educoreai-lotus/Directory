import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DesignSystemProvider } from './context/DesignSystemContext';
import LandingPage from './pages/LandingPage';
import CompanyRegistrationForm from './pages/CompanyRegistrationForm';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import CompanyCSVUploadPage from './pages/CompanyCSVUploadPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import EnrichProfilePage from './pages/EnrichProfilePage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AccessDeniedPage from './pages/AccessDeniedPage';
import Header from './components/Header';
import './App.css';
import { getAccessToken } from './auth/accessTokenStore';
import api from './utils/api';

function RootTransitionScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: 'var(--bg-body, var(--bg-primary))',
        backgroundImage:
          'radial-gradient(circle at 20% 50%, rgba(6, 95, 70, 0.07) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(4, 120, 87, 0.07) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(15, 118, 110, 0.07) 0%, transparent 50%)'
      }}
    >
      <div
        className="max-w-md w-full mx-4 rounded-lg shadow-lg border p-8 text-center"
        style={{
          background: 'var(--gradient-card)',
          borderRadius: 'var(--radius-card, 8px)',
          boxShadow: 'var(--shadow-card)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div
          className="w-10 h-10 mx-auto mb-4 rounded-full animate-pulse"
          style={{ background: 'var(--gradient-primary)' }}
          aria-hidden="true"
        />
        <h2
          className="text-2xl font-bold mb-3"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: 'var(--text-primary)'
          }}
        >
          We&apos;re preparing your personal workspace
        </h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          You&apos;ll be redirected to your personal profile shortly.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Enjoy your EDUCORE AI experience.
        </p>
      </div>
    </div>
  );
}

function RootRouteGate() {
  const { loading, user, isAuthenticated } = useAuth();
  const hasStoredToken = !!getAccessToken();
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const hasHashToken = !!hashParams.get('access_token');

  // Show transition only when root is bootstrapping an authenticated return flow.
  const isPostLoginBootstrap =
    loading && !user && (isAuthenticated || hasStoredToken || hasHashToken);

  if (isPostLoginBootstrap) {
    return <RootTransitionScreen />;
  }

  return <LandingPage />;
}

function AdminRouteGuard({ children }) {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (!user) return <AccessDeniedPage title="Authentication Required" message="Please sign in to continue." />;

  const isSystemAdmin =
    user?.isSystemAdmin === true ||
    user?.isAdmin === true ||
    String(user?.role || '').toUpperCase() === 'DIRECTORY_ADMIN';

  if (!isSystemAdmin) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You do not have permission to access admin pages."
      />
    );
  }
  return children;
}

function EmployeeRouteGuard({ children }) {
  const { loading, user } = useAuth();
  const { employeeId } = useParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verifyAccess = async () => {
      if (loading) {
        if (!cancelled) setIsVerifying(true);
        return;
      }
      if (!user) {
        if (!cancelled) {
          setIsAllowed(false);
          setIsVerifying(false);
        }
        return;
      }

      const userId = user?.directoryUserId || user?.id;
      const companyId = user?.companyId || user?.company_id || user?.organizationId;
      const isSelf = !!userId && String(userId) === String(employeeId);
      const isSystemAdmin =
        user?.isSystemAdmin === true ||
        user?.isAdmin === true ||
        String(user?.role || '').toUpperCase() === 'DIRECTORY_ADMIN';
      const isHrContext = user?.isHR === true && !!companyId;

      if (isSelf || isSystemAdmin) {
        setIsAllowed(true);
        setIsVerifying(false);
        return;
      }

      // Deny by default when frontend cannot prove access.
      if (!isHrContext) {
        setIsAllowed(false);
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        await api.get(`/companies/${companyId}/employees/${employeeId}`);
        if (!cancelled) {
          setIsAllowed(true);
        }
      } catch {
        if (!cancelled) {
          setIsAllowed(false);
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };

    verifyAccess();
    return () => {
      cancelled = true;
    };
  }, [employeeId, loading, user]);

  if (isVerifying) return null;
  if (!user) {
    return <AccessDeniedPage title="Authentication Required" message="Please sign in to continue." />;
  }
  if (!isAllowed) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You do not have permission to view this employee profile."
      />
    );
  }

  return children;
}

// Bot initialization component (must be inside AuthProvider)
function BotInitializer() {
  const { user, isAuthenticated } = useAuth();
  const botInitializedRef = React.useRef(false);

  useEffect(() => {
    // Only initialize if user is logged in
    if (!isAuthenticated || !user || !user.id) {
      return;
    }

    // Get token (nAuth mode uses in-memory only)
    const token = getAccessToken();
    if (!token) return;

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
          <Route path="/" element={<RootRouteGate />} />
          <Route path="/enrich" element={<EnrichProfilePage />} />
          <Route
            path="/employee/:employeeId"
            element={
              <EmployeeRouteGuard>
                <EmployeeProfilePage />
              </EmployeeRouteGuard>
            }
          />
          <Route path="/register" element={<CompanyRegistrationForm />} />
          <Route path="/verify/:companyId" element={<CompanyVerificationPage />} />
          <Route path="/upload/:companyId" element={<CompanyCSVUploadPage />} />
          <Route path="/company/:companyId" element={<CompanyProfilePage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/management-reporting"
            element={
              <AdminRouteGuard>
                <Navigate to="/admin/dashboard" replace />
              </AdminRouteGuard>
            }
          />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
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

