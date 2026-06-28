import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MapPin, Clock, UploadCloud, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function CandidatePortal() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null); // Now storing the full job object
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Form State - Auto populated by Clerk
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  // UI State
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  // 1. FETCH REAL OPEN JOBS ON LOAD AND HYDRATE USER
  useEffect(() => {
    if (user) {
      setCandidateName(user.fullName || '');
      setCandidateEmail(user.primaryEmailAddress?.emailAddress || '');
    }

    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/get-jds/');
        setAvailableJobs(response.data);

        // Check for intended job from Careers Page
        const intendedJobId = localStorage.getItem('intended_job_id');
        if (intendedJobId) {
          const matchedJob = response.data.find(j => j.id.toString() === intendedJobId);
          if (matchedJob) {
            setSelectedJob(matchedJob);
            setExpandedJobId(matchedJob.id);
          }
          localStorage.removeItem('intended_job_id'); // clear it
        }
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      }
    };
    fetchJobs();
  }, [user]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResumeFile(e.dataTransfer.files[0]);
    }
  };

  // 2. SUBMIT TO DJANGO BACKEND
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile || !selectedJob || !candidateName || !candidateEmail) {
      setError("Please fill all fields and upload a resume.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('jd_id', selectedJob.id);
    formData.append('name', candidateName);
    formData.append('email', candidateEmail);
    formData.append('file', resumeFile);

    try {
      // Hits your Django view and triggers the LangGraph agents
      await axios.post('http://127.0.0.1:8000/api/upload-resume/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to process application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setResumeFile(null);
    setCandidateName('');
    setCandidateEmail('');
    setSelectedJob(null);
    setExpandedJobId(null);
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setExpandedJobId(job.id); // Auto-expand when selected
  };

  const toggleJobExpand = (jobId, e) => {
    e.stopPropagation();
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* PREMIUM HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => navigate('/careers')}>
          <div className="w-8 h-8 brand-gradient-bg rounded-lg flex items-center justify-center text-white shadow-soft">
            🍵
          </div>
          <span className="text-slate-900">matcha.ai</span>
          <span className="text-slate-300 font-normal mx-1">|</span>
          <span className="text-slate-500 font-bold">Careers</span>
        </h1>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
             <p className="text-sm font-bold text-slate-900 leading-tight">
               {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Candidate'}
             </p>
           </div>
           <UserButton userProfileUrl="/profile" />
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white py-20 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 via-transparent to-teal-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-grid-slate pointer-events-none opacity-40"></div>
        <p className="label-eyebrow text-green-400 mb-4 relative">Open Roles, Faster Decisions</p>
        <h2 className="text-5xl font-extrabold mb-6 tracking-tight relative">Find Your Next Big Opportunity</h2>
        <p className="text-slate-300 max-w-2xl mx-auto text-xl leading-relaxed relative">
          Upload your profile once. Let our AI instantly match your skills to the perfect role and fast-track your interview.
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">

        {/* LEFT COLUMN: JOB BOARD (SCROLLABLE) */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-extrabold flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-green-100 rounded-lg text-green-700">
                <Briefcase size={24} />
              </div>
              Open Positions
            </h3>
            <span className="badge-slate border border-slate-200 px-3 py-1.5">
              {availableJobs.length} Roles
            </span>
          </div>

          <div className="flex flex-col gap-5 pb-12">
            {availableJobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 card flex flex-col items-center">
                <Briefcase size={48} className="text-slate-300 mb-4" />
                <p className="text-lg">No open positions available at the moment.</p>
              </div>
            ) : (
              availableJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const isExpanded = expandedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleJobSelect(job); }}
                    className={`bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden group
                      ${isSelected ? 'border-green-500 ring-2 ring-green-500/20 shadow-soft-lg' : 'border-slate-200 hover:border-green-300 hover:shadow-soft-lg hover:-translate-y-1 shadow-soft'}`}
                  >
                    <div className={`p-6 ${isSelected ? 'bg-green-50/40' : 'bg-white'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xl font-extrabold text-slate-900 group-hover:text-green-700 transition-colors">
                          {job.title}
                        </h4>
                        <div className="flex items-center gap-3">
                          {isSelected && <CheckCircle2 className="text-green-600 animate-fade-in" size={24} />}
                          <button
                            onClick={(e) => toggleJobExpand(job.id, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm font-bold">
                        <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                          <MapPin size={16} className="text-slate-400"/> Remote / Hybrid
                        </span>
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                          <Clock size={16} className="text-blue-500"/> Full-time
                        </span>
                      </div>
                    </div>

                    {/* EXPANDABLE JOB DETAILS DRAWER */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-6 animate-slide-down">
                        <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                          <FileText size={18} className="text-green-600" />
                          About the Role
                        </h5>
                        <div className="prose-jd">
                          {job.raw_text ? (
                            <p>{job.raw_text}</p>
                          ) : (
                            <p className="text-slate-400 italic">Job description details are currently unavailable.</p>
                          )}
                        </div>
                        {!isSelected && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleJobSelect(job); }}
                            className="mt-6 w-full py-2.5 bg-green-100 hover:bg-green-200 text-green-800 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            Apply for this Role <ChevronRight size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: APPLICATION ZONE (STICKY) */}
        <div className="lg:col-span-5 relative">
          <div className="card p-8 shadow-soft-lg sticky top-24">

            <div className="mb-8">
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Quick Apply</h3>
              {selectedJob ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-bold animate-fade-in">
                  Applying for: <span className="font-extrabold">{selectedJob.title}</span>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Select a role from the list to begin.</p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-start gap-3 animate-fade-in">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-500" />
                <p>{error}</p>
              </div>
            )}

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {!selectedJob && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-soft-lg flex items-center gap-2 animate-bounce">
                      <ChevronRight size={20} className="rotate-180" /> Select a job first
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* HIDDEN INPUTS FOR QUICK APPLY */}
                  <div className="hidden">
                    <input
                      type="text"
                      id="candidate-name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                    />
                    <input
                      type="email"
                      id="candidate-email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="resume-upload" className="field-label">Upload Resume (PDF)</label>
                    <div
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 group
                        ${(!selectedJob || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer hover:bg-green-50/50 hover:border-green-400'}
                        ${dragActive ? 'border-green-500 bg-green-50 scale-[1.02]' : 'border-slate-300'}`}
                      onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                      onClick={() => selectedJob && !isSubmitting && document.getElementById('resume-upload').click()}
                    >
                      <div className={`p-4 rounded-full mb-4 transition-colors ${dragActive || resumeFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-green-50 group-hover:text-green-500'}`}>
                        <UploadCloud size={32} />
                      </div>
                      <p className="text-sm text-slate-700 font-bold text-center mb-1">
                        Drag & drop your PDF here
                      </p>
                      <p className="text-xs text-slate-500 text-center">
                        or <span className="text-green-600 font-bold group-hover:underline">browse files</span>
                      </p>
                      <input id="resume-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => setResumeFile(e.target.files[0])} disabled={!selectedJob || isSubmitting} />
                    </div>
                  </div>

                  {resumeFile && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-sm text-green-800 flex items-center justify-between shadow-soft animate-fade-in">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={20} className="shrink-0 text-green-600" />
                        <span className="truncate font-bold">{resumeFile.name}</span>
                      </div>
                      {!isSubmitting && (
                        <button type="button" onClick={() => setResumeFile(null)} className="text-green-600 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-2" aria-label="Remove file">
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!selectedJob || !resumeFile || isSubmitting}
                  className="btn-dark btn-lg w-full mt-4"
                >
                  {isSubmitting ? (
                     <span className="flex items-center gap-3">
                       <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-500 border-t-white"></span>
                       AI Agents Evaluating...
                     </span>
                  ) : (
                    <>Submit Application <ChevronRight size={20} /></>
                  )}
                </button>
              </form>
            ) : (
              // SUCCESS STATE
              <div className="text-center py-12 animate-zoom-in">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle2 className="text-green-600" size={48} />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-900 mb-3">Application Sent!</h4>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
                  Our AI agents have screened your profile. The HR team is reviewing your results right now.
                </p>
                <button
                  onClick={resetForm}
                  className="btn-secondary btn-md"
                >
                  Apply to another role
                </button>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
