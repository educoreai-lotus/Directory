import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import CompanyRegistrationForm from './pages/CompanyRegistrationForm';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import CompanyCSVUploadPage from './pages/CompanyCSVUploadPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import LoginPage from './pages/LoginPage';
import EnrichProfilePage from './pages/EnrichProfilePage';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <div className="bg-animation"></div>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/enrich" element={<EnrichProfilePage />} />
            <Route path="/register" element={<CompanyRegistrationForm />} />
            <Route path="/verify/:companyId" element={<CompanyVerificationPage />} />
            <Route path="/upload/:companyId" element={<CompanyCSVUploadPage />} />
            <Route path="/company/:companyId" element={<CompanyProfilePage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

