import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, SignIn, SignUp } from '@clerk/clerk-react';
import axios from 'axios';
import { Users, Briefcase, ChevronRight, X } from 'lucide-react';

export default function LandingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState(null);
  const [authMode, setAuthMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [statusMessage, setStatusMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // When user is signed in, check their role and HR status in our backend
  useEffect(() => {
    if (isSignedIn && user && !isSyncing) {
      const syncAndNavigate = async () => {
        setIsSyncing(true);
        setStatusMessage('Syncing your profile...');
        
        // Priority: Component state (if they just clicked it) > Clerk Metadata > null
        const effectiveRole = role || user.publicMetadata?.role;

        try {
          // Check backend if user already exists
          const res = await axios.get(`http://127.0.0.1:8000/api/get-user/${user.id}/`).catch(() => null);
          
          if (res && res.data) {
            // User exists in backend
            // If they have an effective role that differs from backend, sync it
            if (effectiveRole && effectiveRole !== res.data.role) {
              const syncRes = await axios.post('http://127.0.0.1:8000/api/sync-user/', {
                clerk_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                role: effectiveRole
              });
              handleRouting(syncRes.data.role, syncRes.data.is_hr_approved);
            } else {
              handleRouting(res.data.role, res.data.is_hr_approved);
            }
          } else {
            // User just signed in but isn't in backend yet. We need their role!
            if (!effectiveRole) {
              setShowModal(true);
              setIsSyncing(false);
              return;
            }

            // Sync new user with effective role
            const syncRes = await axios.post('http://127.0.0.1:8000/api/sync-user/', {
              clerk_id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              role: effectiveRole
            });

            handleRouting(syncRes.data.role, syncRes.data.is_hr_approved);
          }
        } catch (err) {
          console.error("Sync error:", err);
          setStatusMessage("Error syncing profile. Please try again.");
          setIsSyncing(false);
        }
      };
      
      syncAndNavigate();
    }
  }, [isSignedIn, user, role]);

  const handleRouting = (userRole, isHrApproved) => {
    if (userRole === 'hr') {
      if (isHrApproved) {
        navigate('/hr');
      } else {
        setStatusMessage('Your HR account is pending admin validation. Please wait.');
        setIsSyncing(false);
      }
    } else {
      navigate('/candidate');
    }
  };

  const handleSignOut = () => {
    signOut();
    setRole(null);
    setStatusMessage('');
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-40 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-40 left-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="z-10 text-center max-w-4xl px-4 flex flex-col items-center">
        <h1 className="text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Welcome to <span className="text-green-600">Matcha</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          The ultimate platform bridging top talent with exceptional companies through AI-powered evaluations and streamlined hiring pipelines.
        </p>

        {statusMessage && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-medium shadow-sm flex items-center gap-3">
            {statusMessage}
          </div>
        )}

        {!isSignedIn ? (
          <button 
            onClick={() => setShowModal(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-slate-900 rounded-full overflow-hidden transition-all hover:bg-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            <span className="mr-2">Sign In / Sign Up</span>
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => handleRouting(role || 'candidate', true)}
              className="px-8 py-4 font-bold text-white bg-green-600 rounded-full hover:bg-green-700 shadow-lg"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={handleSignOut}
              className="px-8 py-4 font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 shadow-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Auth & Role Selection Modal */}
      {showModal && !isSignedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setShowModal(false); setRole(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 z-10 bg-slate-100 rounded-full p-1"
            >
              <X size={20} />
            </button>

            {!role ? (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Join Matcha</h2>
                <p className="text-center text-slate-500 mb-8">How would you like to use the platform?</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => setRole('candidate')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-sm">
                      <Users className="text-slate-600 group-hover:text-green-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-bold text-slate-900">I am a Candidate</h3>
                      <p className="text-sm text-slate-500">Find jobs and get AI feedback</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setRole('hr')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-sm">
                      <Briefcase className="text-slate-600 group-hover:text-indigo-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-bold text-slate-900">I am an HR Manager</h3>
                      <p className="text-sm text-slate-500">Evaluate and manage candidates</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 flex justify-center">
                {authMode === 'signIn' ? (
                  <div className="w-full">
                    <SignIn routing="virtual" />
                    <button onClick={() => setAuthMode('signUp')} className="mt-4 text-sm text-green-600 font-medium hover:underline w-full text-center">Need an account? Sign Up</button>
                  </div>
                ) : (
                  <div className="w-full">
                    <SignUp routing="virtual" />
                    <button onClick={() => setAuthMode('signIn')} className="mt-4 text-sm text-green-600 font-medium hover:underline w-full text-center">Already have an account? Sign In</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Collection Modal for already signed-in users without a role */}
      {showModal && isSignedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Complete your profile</h2>
            <p className="text-center text-slate-500 mb-8">Please select your primary role to continue.</p>
            <div className="space-y-4">
              <button 
                onClick={() => setRole('candidate')}
                className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-sm">
                  <Users className="text-slate-600 group-hover:text-green-600" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-bold text-slate-900">I am a Candidate</h3>
                </div>
              </button>
              <button 
                onClick={() => setRole('hr')}
                className="w-full flex items-center p-4 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white group-hover:shadow-sm">
                  <Briefcase className="text-slate-600 group-hover:text-indigo-600" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-bold text-slate-900">I am an HR Manager</h3>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
