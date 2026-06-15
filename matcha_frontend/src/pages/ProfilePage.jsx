import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import DashboardLayout from '../components/DashboardLayout';
import { CheckCircle2, Clock, XCircle, ChevronRight, FileText, Trash2, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const { getToken } = useAuth();

  // We assume the user's role is stored in backend, but we'll fetch apps based on email
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
    if (status === 'Rejected') return <XCircle className="text-red-500" size={20} />;
    if (status === 'Offer' || status === 'Shortlisted') return <CheckCircle2 className="text-green-500" size={20} />;
    return <Clock className="text-amber-500" size={20} />;
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
    <>
      <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">My Profile</h2>
        
        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-10 flex items-center gap-6">
          <div className="scale-150 origin-left">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-16 h-16" } }} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{user?.fullName || 'Candidate'}</h3>
            <p className="text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>

        {/* APPLICATION HISTORY */}
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <FileText className="text-green-600" /> Application History
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <span className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-green-600 mb-4"></span>
            Loading your applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <p className="text-lg mb-4">You haven't applied to any roles yet.</p>
            <a href="/careers" className="text-green-600 font-bold hover:underline inline-flex items-center gap-1">
              Browse Open Roles <ChevronRight size={18} />
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-bold uppercase tracking-wider">
                  <th className="p-4">Role</th>
                  <th className="p-4">Applied On</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{app.role}</td>
                    <td className="p-4 text-slate-500">
                      {app.applied_on ? new Date(app.applied_on).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(app.status)}
                        <span className="font-semibold text-slate-700">{app.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleRevokeClick(app.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-2 ml-auto text-sm font-bold"
                      >
                        <Trash2 size={16} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
      
      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Revoke Application?</h2>
              <p className="text-slate-500 text-sm">
                Are you sure you want to revoke this application? All your data, resume files, and AI screening results will be <strong>permanently erased</strong> from our database. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRevoke}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                Yes, Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
