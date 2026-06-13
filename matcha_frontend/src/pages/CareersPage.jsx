import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MapPin, Clock, ChevronDown, ChevronUp, FileText, ChevronRight } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function CareersPage() {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState(null);
  
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
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
        await axios.delete(`http://127.0.0.1:8000/api/delete-jd/${jobId}/`);
        setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
      } catch (err) {
        console.error("Failed to delete job:", err);
        alert("Failed to delete the job description.");
      }
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
                          <button 
                            onClick={(e) => handleDelete(job.id, e)}
                            className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-colors font-bold mr-2"
                          >
                            Delete
                          </button>
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
    </div>
  );
}
