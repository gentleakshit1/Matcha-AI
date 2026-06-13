import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HRDashboard from './pages/HRDashboard';
import CandidatePortal from './pages/CandidatePortal';
import LandingPage from './pages/LandingPage';
import CareersPage from './pages/CareersPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
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
            <ProtectedRoute allowedRoles={['candidate']}>
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

        {/* HR Routes */}
        <Route 
          path="/hr" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;