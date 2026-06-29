import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, SignIn, SignUp } from '@clerk/clerk-react';
import axios from 'axios';
import { Users, Briefcase, ChevronRight, X } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

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

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-canvas text-ink font-sans">Loading...</div>;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <TopNav />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Atmospheric Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,_var(--color-gradient-mint)_0%,_transparent_70%)] opacity-30 mix-blend-multiply filter blur-2xl animate-pulse-slow pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,_var(--color-gradient-lavender)_0%,_transparent_70%)] opacity-20 mix-blend-multiply filter blur-2xl animate-pulse-slow pointer-events-none translate-x-1/2 -translate-y-1/2" style={{animationDelay: '2s'}}></div>
        
        <div className="flex-1 flex items-center justify-center px-6 py-[96px] z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-5xl md:text-7xl text-ink font-light tracking-tight mb-8">
              Welcome to Matcha
            </h1>
            <p className="font-sans text-[20px] text-body-strong mb-[48px] max-w-2xl mx-auto leading-[1.35]">
              The ultimate platform bridging top talent with exceptional companies through AI-powered evaluations and streamlined hiring pipelines.
            </p>

            {statusMessage && (
              <div className="mb-8 p-[16px] bg-canvas-soft border border-hairline-strong text-ink rounded-md font-sans text-body-sm shadow-sm flex items-center justify-center">
                {statusMessage}
              </div>
            )}

            {!isSignedIn ? (
              <Button onClick={() => setShowModal(true)} className="h-[48px] px-[32px] text-[16px]">
                Sign In / Sign Up
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="animate-pulse-slow rounded-full h-12 w-12 border border-hairline-strong bg-canvas-soft flex items-center justify-center">
                  <div className="h-4 w-4 bg-ink rounded-full animate-bounce"></div>
                </div>
                <p className="text-body font-sans text-body-md animate-pulse">Taking you to your workspace...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Auth & Role Selection Modal */}
      {showModal && !isSignedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/40 backdrop-blur-md p-4">
          <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => { setShowModal(false); setRole(null); }}
              className="absolute top-4 right-4 text-muted hover:text-ink z-10 rounded-full p-2 hover:bg-canvas transition-colors"
            >
              <X size={20} />
            </button>

            {!role ? (
              <div className="p-4">
                <h2 className="font-display text-3xl text-center text-ink mb-2">Join Matcha</h2>
                <p className="font-sans text-center text-muted mb-8 text-[15px]">How would you like to use the platform?</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => setRole('candidate')}
                    className="w-full flex items-center p-4 border border-hairline rounded-xl hover:border-ink hover:bg-canvas-soft transition-all group"
                  >
                    <div className="bg-canvas p-3 rounded-full group-hover:bg-surface-card border border-hairline group-hover:border-hairline-soft">
                      <Users className="text-muted group-hover:text-ink w-5 h-5" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-sans font-medium text-ink text-[16px]">I am a Candidate</h3>
                      <p className="font-sans text-[14px] text-body">Find jobs and get AI feedback</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setRole('hr')}
                    className="w-full flex items-center p-4 border border-hairline rounded-xl hover:border-ink hover:bg-canvas-soft transition-all group"
                  >
                    <div className="bg-canvas p-3 rounded-full group-hover:bg-surface-card border border-hairline group-hover:border-hairline-soft">
                      <Briefcase className="text-muted group-hover:text-ink w-5 h-5" />
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="font-sans font-medium text-ink text-[16px]">I am an HR Manager</h3>
                      <p className="font-sans text-[14px] text-body">Evaluate and manage candidates</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex justify-center w-full">
                {authMode === 'signIn' ? (
                  <div className="w-full">
                    <SignIn routing="virtual" />
                    <button onClick={() => setAuthMode('signUp')} className="mt-6 text-[14px] text-ink font-sans font-medium hover:underline w-full text-center">Need an account? Sign Up</button>
                  </div>
                ) : (
                  <div className="w-full">
                    <SignUp routing="virtual" />
                    <button onClick={() => setAuthMode('signIn')} className="mt-6 text-[14px] text-ink font-sans font-medium hover:underline w-full text-center">Already have an account? Sign In</button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Role Collection Modal for already signed-in users without a role */}
      {showModal && isSignedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/40 backdrop-blur-md p-4">
          <Card className="w-full max-w-md p-8 relative">
            <h2 className="font-display text-3xl text-center text-ink mb-2">Complete your profile</h2>
            <p className="font-sans text-center text-muted mb-8 text-[15px]">Please select your primary role to continue.</p>
            <div className="space-y-4">
              <button 
                onClick={() => setRole('candidate')}
                className="w-full flex items-center p-4 border border-hairline rounded-xl hover:border-ink hover:bg-canvas-soft transition-all group"
              >
                <div className="bg-canvas p-3 rounded-full border border-hairline">
                  <Users className="text-muted group-hover:text-ink w-5 h-5" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-sans font-medium text-ink text-[16px]">I am a Candidate</h3>
                </div>
              </button>
              <button 
                onClick={() => setRole('hr')}
                className="w-full flex items-center p-4 border border-hairline rounded-xl hover:border-ink hover:bg-canvas-soft transition-all group"
              >
                <div className="bg-canvas p-3 rounded-full border border-hairline">
                  <Briefcase className="text-muted group-hover:text-ink w-5 h-5" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="font-sans font-medium text-ink text-[16px]">I am an HR Manager</h3>
                </div>
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
