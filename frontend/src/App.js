import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CompanyRegistrationForm from './pages/CompanyRegistrationForm';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import CompanyCSVUploadPage from './pages/CompanyCSVUploadPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="bg-animation"></div>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<CompanyRegistrationForm />} />
          <Route path="/verify/:companyId" element={<CompanyVerificationPage />} />
          <Route path="/upload/:companyId" element={<CompanyCSVUploadPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

