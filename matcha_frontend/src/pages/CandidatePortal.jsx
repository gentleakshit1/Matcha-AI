import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MapPin, Clock, UploadCloud, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, FileText, AlertCircle, X } from 'lucide-react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function CandidatePortal() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);
  
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setCandidateName(user.fullName || '');
      setCandidateEmail(user.primaryEmailAddress?.emailAddress || '');
    }

    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/get-jds/`);
        setAvailableJobs(response.data);
        
        const intendedJobId = localStorage.getItem('intended_job_id');
        if (intendedJobId) {
          const matchedJob = response.data.find(j => j.id.toString() === intendedJobId);
          if (matchedJob) {
            setSelectedJob(matchedJob);
            setExpandedJobId(matchedJob.id);
          }
          localStorage.removeItem('intended_job_id');
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
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/upload-resume/`, formData, {
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
    setExpandedJobId(job.id);
  };

  const toggleJobExpand = (jobId, e) => {
    e.stopPropagation();
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-ink">
      <TopNav />

      {/* HERO SECTION */}
      <div className="bg-canvas py-[96px] px-6 text-center relative overflow-hidden border-b border-hairline-soft">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_var(--color-gradient-sky)_0%,_transparent_60%)] opacity-40 mix-blend-multiply filter blur-3xl animate-pulse-slow pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        
        <h2 className="font-display text-[48px] md:text-[64px] font-light tracking-tight mb-4 relative z-10 text-ink">
          Candidate Portal
        </h2>
        <p className="text-body max-w-2xl mx-auto text-[16px] leading-[1.5] relative z-10">
          Upload your profile once. Let our AI instantly match your skills to the perfect role and fast-track your interview.
        </p>
      </div>

      <main className="max-w-[1200px] mx-auto w-full px-6 py-[64px] flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: JOB BOARD */}
        <div className="md:col-span-7">
          <div className="flex items-center justify-between mb-6 border-b border-hairline pb-4">
            <h3 className="text-[20px] font-medium font-sans text-ink flex items-center gap-2">
              <Briefcase size={20} className="text-muted" />
              Open Positions
            </h3>
            <span className="text-[13px] font-bold tracking-[0.96px] uppercase text-muted">
              {availableJobs.length} Roles
            </span>
          </div>
          
          <div className="flex flex-col gap-4 pb-12">
            {availableJobs.length === 0 ? (
              <Card className="text-center py-12 transition-opacity duration-500">
                <Briefcase size={40} className="text-muted-soft mx-auto mb-4" />
                <p className="text-[16px] text-body">No open positions available at the moment.</p>
              </Card>
            ) : (
              availableJobs.map((job, index) => {
                const isSelected = selectedJob?.id === job.id;
                const isExpanded = expandedJobId === job.id;
                
                return (
                  <Card 
                    key={job.id} 
                    onClick={() => handleJobSelect(job)}
                    style={{ animationDelay: `${index * 100}ms` }}
                    className={`cursor-pointer transition-all duration-300 p-0 overflow-hidden group hover:-translate-y-1 ${isSelected ? 'border-ink ring-1 ring-ink shadow-md scale-[1.01]' : 'hover:border-hairline-strong hover:shadow-md'}`}
                  >
                    <div className={`p-[24px] transition-colors duration-300 ${isSelected ? 'bg-canvas-soft' : 'bg-canvas group-hover:bg-canvas-soft/50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className={`text-[18px] font-medium font-sans transition-colors duration-300 ${isSelected ? 'text-ink' : 'text-body-strong group-hover:text-ink'}`}>
                          {job.title}
                        </h4>
                        <div className="flex items-center gap-3">
                          {isSelected && <CheckCircle2 className="text-ink transition-transform duration-300" size={20} />}
                          <button 
                            onClick={(e) => toggleJobExpand(job.id, e)}
                            className="text-muted hover:text-ink transition-all duration-300 p-1 hover:bg-canvas rounded-full"
                          >
                            <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                              <ChevronDown size={20} />
                            </div>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-[14px] text-body">
                        <span className="flex items-center gap-1.5 transition-colors group-hover:text-ink">
                          <MapPin size={16} className="text-muted-soft group-hover:text-muted transition-colors"/> Remote / Hybrid
                        </span>
                        <span className="flex items-center gap-1.5 transition-colors group-hover:text-ink">
                          <Clock size={16} className="text-muted-soft group-hover:text-muted transition-colors"/> Full-time
                        </span>
                      </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="border-t border-hairline bg-canvas-soft p-[24px]">
                        <h5 className="font-sans font-medium text-[15px] text-ink flex items-center gap-2 mb-3">
                          <FileText size={16} className="text-muted" />
                          About the Role
                        </h5>
                        <div className="prose prose-sm prose-slate max-w-none text-[14px] text-body leading-[1.6]">
                          {job.raw_text ? (
                            <p className="whitespace-pre-wrap">{job.raw_text}</p>
                          ) : (
                            <p className="italic text-muted-soft">Job description details are currently unavailable.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: APPLICATION ZONE */}
        <div className="md:col-span-5 relative">
          <div className="sticky top-[100px] transition-all duration-500">
            <Card className="shadow-lg overflow-hidden transition-all duration-500">
              <div className="mb-8">
                <h3 className="font-display text-[32px] tracking-tight text-ink mb-2">Apply</h3>
                <div className="h-[32px] flex items-center">
                  {selectedJob ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-canvas-soft border border-hairline text-body rounded-full text-[13px] font-medium transition-all duration-300">
                      Applying for: <span className="font-bold text-ink">{selectedJob.title}</span>
                    </div>
                  ) : (
                    <p className="text-muted text-[15px] transition-opacity duration-300">Select a role from the list to begin.</p>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-canvas-soft text-ink text-[14px] rounded-xl border border-hairline flex items-start gap-3 transition-all duration-300">
                  <AlertCircle size={20} className="shrink-0 mt-0.5 text-muted" />
                  <p>{error}</p>
                </div>
              )}

              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative">
                  
                  {!selectedJob && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm bg-canvas/30 transition-opacity duration-300">
                      <div className="bg-canvas border-2 border-hairline-strong text-ink px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 text-[15px] transform transition-transform hover:scale-105 animate-pulse-slow cursor-not-allowed">
                        <Briefcase className="text-muted" size={20} />
                        Select a job first
                      </div>
                    </div>
                  )}

                  <div className={`space-y-4 transition-all duration-500 ${!selectedJob ? 'opacity-30 blur-[1px]' : 'opacity-100'}`}>
                    <div className="hidden">
                      <input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
                      <input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-[14px] font-medium text-ink mb-2">Upload Resume (PDF)</label>
                      <div
                        className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 group
                          ${(!selectedJob || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-canvas border-hairline' : 'cursor-pointer hover:bg-canvas-soft hover:border-ink'}
                          ${dragActive ? 'border-ink bg-canvas-soft' : 'border-hairline-strong bg-surface-card'}`}
                        onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                        onClick={() => selectedJob && !isSubmitting && document.getElementById('resume-upload').click()}
                      >
                        <div className={`p-4 rounded-full mb-4 transition-colors ${dragActive || resumeFile ? 'bg-canvas-soft text-ink border border-hairline' : 'bg-canvas text-muted border border-transparent group-hover:border-hairline'}`}>
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-[14px] text-ink font-medium text-center mb-1">
                          Drag & drop your PDF here
                        </p>
                        <p className="text-[13px] text-muted text-center">
                          or <span className="text-ink font-medium underline">browse files</span>
                        </p>
                        <input id="resume-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => setResumeFile(e.target.files[0])} disabled={!selectedJob || isSubmitting} />
                      </div>
                    </div>

                    {resumeFile && (
                      <div className="bg-canvas-soft p-4 rounded-md border border-hairline text-[14px] text-ink flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={18} className="shrink-0 text-muted" />
                          <span className="truncate font-medium">{resumeFile.name}</span>
                        </div>
                        {!isSubmitting && (
                          <button type="button" onClick={() => setResumeFile(null)} className="text-muted hover:text-ink p-1 transition-colors ml-2">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={!selectedJob || !resumeFile || isSubmitting}
                    className="w-full mt-4 h-[48px]"
                  >
                    {isSubmitting ? "Evaluating..." : "Submit Application"}
                  </Button>
                </form>
              ) : (
                <div className="w-full flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in zoom-in duration-500">
                  <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-[#10b981]/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="w-20 h-20 bg-[#10b981]/10 border-2 border-[#10b981]/30 rounded-full flex items-center justify-center relative z-10 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 cursor-default">
                      <CheckCircle2 className="text-[#10b981]" size={40} strokeWidth={2.5} />
                    </div>
                  </div>
                  <h4 className="text-[32px] font-display text-ink mb-4 tracking-tight animate-in slide-in-from-bottom-2 duration-500 delay-100">Application Sent!</h4>
                  <p className="w-full text-body text-[16px] mb-10 max-w-md mx-auto leading-relaxed text-center animate-in slide-in-from-bottom-2 duration-500 delay-200">
                    Our AI agent has successfully screened your profile. The HR team is now reviewing your personalized assessment.
                  </p>
                  <Button variant="outline" onClick={resetForm} className="px-8 py-3 rounded-full hover:shadow-md hover:-translate-y-0.5 transition-all animate-in slide-in-from-bottom-2 duration-500 delay-300">
                    Apply to another role
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}