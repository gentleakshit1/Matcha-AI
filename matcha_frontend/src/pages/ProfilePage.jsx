import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser, UserButton } from '@clerk/clerk-react';
import DashboardLayout from '../components/DashboardLayout';
import { CheckCircle2, Clock, XCircle, ChevronRight, FileText } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useUser();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
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
                  <th className="p-4 text-right">Status</th>
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
                      <div className="flex items-center justify-end gap-2">
                        {getStatusIcon(app.status)}
                        <span className="font-semibold text-slate-700">{app.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
