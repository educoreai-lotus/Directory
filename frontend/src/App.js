import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import ChatbotContainer from './components/ChatbotContainer';
import './App.css';

function App() {
  return (
    <Router>
      <DesignSystemProvider>
        <AuthProvider>
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
            <ChatbotContainer />
          </div>
        </AuthProvider>
      </DesignSystemProvider>
    </Router>
  );
}

export default App;

