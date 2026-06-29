import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HRDashboard from './pages/HRDashboard';
import CandidatePortal from './pages/CandidatePortal';
import LandingPage from './pages/LandingPage';
import CareersPage from './pages/CareersPage';
import ProfilePage from './pages/ProfilePage';
import InterviewPortal from './pages/InterviewPortal';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function App() {

  return (
    <>
      <Toaster position="bottom-center" />
      <div>
        <Router>
          <Routes>
            {/* Landing Page */}
            <Route 
              path="/" 
              element={<LandingPage />} 
            />
            <Route 
              path="/careers" 
              element={<CareersPage />} 
            />
            <Route 
              path="/candidate" 
              element={
                <ProtectedRoute allowedRoles={['candidate', 'hr']}>
                  <CandidatePortal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />

            {/* Interview Portal (Public but token protected) */}
            <Route 
              path="/interview/:token" 
              element={<InterviewPortal />} 
            />
            <Route 
              path="/interview" 
              element={
                <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center text-white font-sans">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Invalid Interview Link</h1>
                    <p className="text-gray-400">Please make sure you have the complete interview link containing your token.</p>
                  </div>
                </div>
              } 
            />

            {/* HR Routes */}
            <Route 
              path="/hr" 
              element={
                <ProtectedRoute allowedRoles={['hr']}>
                  <HRDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all 404 Route */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center text-white font-sans">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2">404</h1>
                    <p className="text-gray-400">Page not found</p>
                  </div>
                </div>
              } 
            />
          </Routes>
        </Router>
      </div>
    </>
  );
}

export default App;