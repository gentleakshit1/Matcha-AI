import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MapPin, Clock, ChevronDown, ChevronUp, FileText, ChevronRight, Edit2, X } from 'lucide-react';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function CareersPage() {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRawText, setEditRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/get-jds/');
        setAvailableJobs(response.data);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  const toggleJobExpand = (jobId, e) => {
    e.stopPropagation();
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const handleDelete = async (jobId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this Job Description and all its candidates?")) {
      try {
        const token = await getToken();
        await axios.delete(`http://127.0.0.1:8000/api/delete-jd/${jobId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
      } catch (err) {
        console.error("Failed to delete job:", err);
        alert("Failed to delete the job description.");
      }
    }
  };

  const handleEditClick = (job, e) => {
    e.stopPropagation();
    setEditingJob(job);
    setEditTitle(job.title);
    setEditRawText(job.raw_text || '');
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = await getToken();
      await axios.put(`http://127.0.0.1:8000/api/edit-jd/${editingJob.id}/`, 
        { title: editTitle, raw_text: editRawText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAvailableJobs(prev => prev.map(j => 
        j.id === editingJob.id ? { ...j, title: editTitle, raw_text: editRawText } : j
      ));
      setEditingJob(null);
    } catch (err) {
      console.error("Failed to edit job:", err);
      alert("Failed to edit job description. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = (jobId) => {
    // Save intended job to localStorage for after-login redirect
    localStorage.setItem('intended_job_id', jobId);
    
    if (isSignedIn) {
      navigate('/candidate');
    } else {
      openSignIn({ afterSignInUrl: '/candidate', afterSignUpUrl: '/candidate' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-inner">💡</div>
            <span className="text-slate-900">matcha.ai</span>
            <span className="text-slate-300 font-normal mx-1">|</span>
            <span className="text-slate-500 font-medium">Careers</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {!isSignedIn && (
            <button 
              onClick={() => openSignIn({ afterSignInUrl: '/candidate' })}
              className="text-sm font-bold bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white py-20 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none"></div>
        <h2 className="text-5xl font-extrabold mb-6 tracking-tight">Open Positions</h2>
        <p className="text-slate-300 max-w-2xl mx-auto text-xl leading-relaxed">
          Join our mission to revolutionize hiring with AI. Explore open roles below.
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-5">
          {availableJobs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
              <Briefcase size={48} className="text-slate-300 mb-4" />
              <p className="text-lg">No open positions available at the moment.</p>
            </div>
          ) : (
            availableJobs.map((job, index) => {
              const isExpanded = expandedJobId === job.id;
              const visualId = availableJobs.length - index; // Re-sequences perfectly based on array length
              
              return (
                <div key={job.id} className="bg-white rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all overflow-hidden group">
                  <div className="p-6 cursor-pointer" onClick={(e) => toggleJobExpand(job.id, e)}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-xl font-bold text-slate-900 group-hover:text-green-700 transition-colors flex items-center gap-2">
                        <span className="text-sm bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200">Pipeline #{visualId}</span>
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {user?.publicMetadata?.role === 'hr' && (
                          <>
                            <button 
                              onClick={(e) => handleEditClick(job, e)}
                              className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors font-bold mr-2 flex items-center gap-1"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={(e) => handleDelete(job.id, e)}
                              className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-colors font-bold mr-2"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <button 
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-sm font-medium">
                      <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                        <MapPin size={16} className="text-slate-400"/> Remote / Hybrid
                      </span>
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                        <Clock size={16} className="text-blue-500"/> Full-time
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-6 animate-in slide-in-from-top-2 duration-200">
                      <h5 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                        <FileText size={18} className="text-green-600" />
                        About the Role
                      </h5>
                      <div className="prose prose-sm prose-slate max-w-none">
                        {job.raw_text ? (
                          <p className="whitespace-pre-wrap text-slate-600 leading-relaxed">{job.raw_text}</p>
                        ) : (
                          <p className="text-slate-400 italic">Job description details are currently unavailable.</p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleApply(job.id)}
                        className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      >
                        Apply for this Role <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Edit JD Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit Job Description</h2>
              <button onClick={() => setEditingJob(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Job Title</label>
                <input 
                  required
                  className="w-full p-3 border rounded-lg"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Raw Job Description Text</label>
                <textarea 
                  required
                  className="w-full p-3 border rounded-lg h-64 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm leading-relaxed"
                  value={editRawText}
                  onChange={(e) => setEditRawText(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Saving this will automatically re-train the AI agent with the new description. Existing evaluations will not be re-scored.
                </p>
              </div>

              <div className="flex gap-4 w-full mt-4">
                <button 
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Updating AI Agent...</>
                  ) : "Save & Sync with AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
