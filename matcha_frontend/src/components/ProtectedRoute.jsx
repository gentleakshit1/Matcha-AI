import React, { useState, useEffect } from 'react';
import { useUser, RedirectToSignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [backendProfile, setBackendProfile] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isSignedIn && user) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/get-user/${user.id}/`)
        .then(res => {
          setBackendProfile(res.data);
          setIsChecking(false);
        })
        .catch(err => {
          console.error("Failed to fetch backend profile in ProtectedRoute", err);
          setIsChecking(false);
        });
    } else if (isLoaded && !isSignedIn) {
      setIsChecking(false);
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-green-600"></div>
          <p className="text-slate-500 font-medium">Authorizing...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (!backendProfile) {
    // They are signed into Clerk but no backend profile exists.
    // Send them back to landing page to sync.
    return <Navigate to="/" replace />;
  }

  const userRole = backendProfile.role;
  const isHrApproved = backendProfile.is_hr_approved;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  if (userRole === 'hr' && !isHrApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Pending Validation</h2>
          <p className="text-slate-600 mb-6">
            Your HR account is pending admin approval. Please wait until your credentials are validated.
          </p>
          <a href="/" className="text-indigo-600 font-bold hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  return children;
}
