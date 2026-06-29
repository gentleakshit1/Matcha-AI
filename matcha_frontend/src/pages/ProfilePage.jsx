import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import DashboardLayout from '../components/DashboardLayout';
import { CheckCircle2, Clock, XCircle, ChevronRight, FileText, Trash2, AlertTriangle, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function ProfilePage() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      const fetchApps = async () => {
        try {
          const res = await axios.get(`http://127.0.0.1:8000/api/get-my-applications/?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`);
          setApplications(res.data);
        } catch (err) {
          console.error("Failed to fetch applications:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchApps();
    }
  }, [user]);

  const getStatusIcon = (status) => {
    if (status === 'Rejected') return <XCircle className="text-red-500" size={18} />;
    if (status === 'Offer' || status === 'Shortlisted') return <CheckCircle2 className="text-ink" size={18} />;
    return <Clock className="text-muted" size={18} />;
  };

  const handleRevokeClick = (id) => {
    setRevokingId(id);
    setShowRevokeModal(true);
  };

  const confirmRevoke = async () => {
    try {
      const token = await getToken();
      await axios.delete(`http://127.0.0.1:8000/api/revoke-application/${revokingId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(prev => prev.filter(app => app.id !== revokingId));
      setShowRevokeModal(false);
      setRevokingId(null);
    } catch (err) {
      console.error("Failed to revoke application:", err);
      alert("Failed to revoke application. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-canvas">
        {/* Peach Orb Atmospheric Background */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,_var(--color-gradient-peach)_0%,_transparent_60%)] opacity-30 mix-blend-multiply filter blur-3xl animate-pulse-slow pointer-events-none -translate-x-1/4 -translate-y-1/4 z-0"></div>

        <div className="max-w-[1000px] mx-auto py-[64px] px-8 relative z-10">
          <h2 className="font-display text-[48px] font-light tracking-tight text-ink mb-12">Profile</h2>
          
          {/* PROFILE CARD */}
          <Card className="mb-12 flex items-center gap-8 bg-surface-card border-hairline p-[32px]">
            <div className="scale-[2] origin-left ml-4">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-12 h-12" } }} />
            </div>
            <div>
              <h3 className="font-display text-[32px] font-light text-ink tracking-tight mb-1">{user?.fullName || 'Candidate'}</h3>
              <p className="font-sans text-[15px] text-body">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </Card>

          {/* APPLICATION HISTORY */}
          <h3 className="font-sans font-medium text-[20px] text-ink mb-6 flex items-center gap-2">
            <FileText className="text-muted" size={20} /> Application History
          </h3>

          {isLoading ? (
            <div className="text-center py-16 text-muted flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border border-ink border-t-transparent mb-4"></div>
              Loading your applications...
            </div>
          ) : applications.length === 0 ? (
            <Card className="text-center py-[64px] bg-canvas-soft border-hairline">
              <p className="text-[16px] text-body mb-6">You haven't applied to any roles yet.</p>
              <a href="/careers" className="inline-flex items-center gap-2 font-medium text-ink hover:text-muted transition-colors border-b border-ink pb-1">
                Browse Open Roles <ChevronRight size={16} />
              </a>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden bg-surface-card border-hairline">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-canvas-soft border-b border-hairline text-muted text-[12px] font-bold uppercase tracking-[0.96px]">
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Applied On</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, index) => (
                    <tr key={app.id} className={`${index !== applications.length - 1 ? 'border-b border-hairline-soft' : ''} hover:bg-canvas-soft transition-colors`}>
                      <td className="px-6 py-4 font-medium text-ink text-[15px]">{app.role}</td>
                      <td className="px-6 py-4 text-body text-[14px]">
                        {app.applied_on ? new Date(app.applied_on).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(app.status)}
                          <span className="font-medium text-[14px] text-ink">{app.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRevokeClick(app.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center justify-center ml-auto"
                          title="Revoke Application"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
      
      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-surface-dark/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md relative p-8">
            <button 
              onClick={() => setShowRevokeModal(false)}
              className="absolute top-4 right-4 p-2 text-muted hover:text-ink transition-colors rounded-full hover:bg-canvas-soft"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="font-display text-[32px] text-ink mb-3 tracking-tight">Revoke Application?</h2>
              <p className="text-body font-sans text-[15px] leading-[1.6]">
                Are you sure you want to revoke this application? All your data, resume files, and AI screening results will be <strong>permanently erased</strong> from our database.
              </p>
            </div>
            <div className="flex gap-4 w-full">
              <Button 
                variant="outline"
                onClick={() => setShowRevokeModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmRevoke}
                className="flex-1 !bg-red-600 !text-white hover:!bg-red-700"
              >
                Yes, Revoke
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
