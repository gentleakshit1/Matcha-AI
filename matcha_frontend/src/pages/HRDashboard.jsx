import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import UploadJDModal from '../components/UploadJDModal';
import { UploadCloud, X, Trash2, ChevronRight, CheckCircle2, Copy, FileText, Info, Link, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const STATUS_OPTIONS = ['Evaluating', 'Shortlisted', 'Interview', 'Rejected'];

export default function HRDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const { getToken, isLoaded } = useAuth();
  const navigate = useNavigate();

  const fetchCandidates = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setIsLoading(true);
      const token = await getToken();
      if (!token) return;
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/get-candidates/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(response.data) ? response.data : response.data.candidates || [];
      const processedData = data.map(c => ({ ...c, status: c.status || 'Applied' }));
      setCandidates(processedData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Access Denied: ${err.response.data.detail}`);
      } else {
        setError("Access Denied: You do not have permission to view this pipeline.");
      }
    } finally {
      if (showLoadingIndicator) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchCandidates();
    }
  }, [isLoaded]);

  useEffect(() => {
    let intervalId;
    if (candidates.some(c => c.status === 'Evaluating')) {
      intervalId = setInterval(() => {
        fetchCandidates(false);
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [candidates]);

  const handleStatusChange = async (candidateId, newStatus) => {
    if (newStatus === 'Evaluating') {
      setError("Candidates cannot be moved back to the Evaluating stage.");
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.status === newStatus) return;

    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate(prev => ({ ...prev, status: newStatus }));
    }

    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/update-candidate-status/`, {
        candidate_id: candidateId,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Failed to save candidate status change.");
      fetchCandidates(false);
    }
  };

  const handleScheduleInterview = async (candidateId) => {
    try {
      setIsGeneratingLink(true);
      toast.loading("Generating link and sending email...", { id: 'schedule-toast' });
      const token = await getToken();
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/interviews/schedule/`, {
        candidate_id: candidateId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Link Generated & Email Sent!", { id: 'schedule-toast' });
      
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate({
          ...selectedCandidate,
          status: 'Interview',
          generated_link: response.data.interview_link
        });
      }
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: 'Interview', generated_link: response.data.interview_link } : c));
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule interview. Ensure backend is running.", { id: 'schedule-toast' });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleDeleteCandidate = async (candidateId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      try {
        const token = await getToken();
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/delete-candidate/${candidateId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
        if (selectedCandidate?.id === candidateId) setSelectedCandidate(null);
      } catch (err) {
        console.error("Failed to delete candidate:", err);
        setError("Failed to delete candidate.");
      }
    }
  };

  const filteredCandidates = activeTab === 'All' 
    ? candidates 
    : candidates.filter(c => c.status === activeTab);

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden flex bg-canvas">
        {/* Mint Orb Atmospheric Background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_var(--color-gradient-mint)_0%,_transparent_60%)] opacity-30 mix-blend-multiply filter blur-3xl animate-pulse-slow pointer-events-none translate-x-1/4 -translate-y-1/4 z-0"></div>

        {/* Master-Detail Split Container */}
        <div className="flex w-full h-[calc(100vh-64px)] relative z-10 pt-[48px]">
          
          {/* LEFT COLUMN: Candidate List */}
          <div className="w-[450px] shrink-0 border-r border-hairline flex flex-col h-full bg-canvas shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1)] z-10">
            {/* Header & Filters */}
            <div className="px-6 pb-6 pt-2 shrink-0">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h2 className="font-display text-[32px] font-light tracking-tight text-ink leading-none">Candidates</h2>
                 </div>
                 <Button onClick={() => setIsModalOpen(true)} className="px-3 py-2 h-auto text-[13px]">
                   <UploadCloud size={16} className="mr-1.5" />
                   New JD
                 </Button>
              </div>

              {error && <div className="mb-4 p-3 bg-canvas-soft border border-hairline-strong text-ink rounded-lg font-medium text-[13px] flex items-center gap-2"><X size={16} className="text-muted shrink-0" /> {error}</div>}

              {/* TAB FILTERS */}
              <div className="flex flex-wrap gap-2">
                {['All', ...STATUS_OPTIONS].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${activeTab === tab ? 'bg-ink text-canvas border-ink shadow-md' : 'text-body bg-canvas-soft border-hairline hover:border-hairline-strong'}`}
                  >
                    {tab}
                    <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-canvas/20' : 'bg-surface-card border border-hairline'}`}>
                      {tab === 'All' ? candidates.length : candidates.filter(c => c.status === tab).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Cards List */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 relative">
              {isLoading ? (
                <div className="text-muted text-center py-10 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border border-ink border-t-transparent"></div>
                  <span className="text-[13px]">Loading candidates...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-8 text-center text-muted text-[13px] bg-canvas-soft rounded-xl border border-hairline mx-2">
                  No candidates found in this stage.
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedCandidate?.id === candidate.id ? 'bg-canvas-soft border-ink shadow-md scale-[1.01]' : 'bg-surface-card border-hairline hover:border-hairline-strong hover:bg-canvas'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[15px] font-sans text-ink leading-tight pr-2">{candidate.name}</h4>
                      {candidate.status === 'Evaluating' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 bg-canvas px-2 py-0.5 rounded-full border border-hairline">
                          <div className="w-2.5 h-2.5 border border-muted border-t-transparent rounded-full animate-spin"></div>
                          Evaluating
                        </span>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-bold tracking-wide border shrink-0 ${candidate.score >= 70 ? 'bg-canvas text-ink border-ink shadow-sm' : 'bg-canvas-soft text-muted border-hairline'}`}>
                          {candidate.score}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-body line-clamp-1 mb-3">{candidate.role}</p>
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-ink/70 uppercase tracking-wider bg-canvas border border-hairline px-2 py-0.5 rounded-md">
                         {candidate.status}
                       </span>
                       <button 
                          onClick={(e) => handleDeleteCandidate(candidate.id, e)} 
                          className="text-muted hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
                          title="Delete Candidate"
                       >
                          <Trash2 size={14} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Candidate Detail Profile */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto bg-canvas-soft/30">
            {!selectedCandidate ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                <div className="w-24 h-24 bg-canvas border border-hairline rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <FileText className="w-10 h-10 text-muted/50" />
                </div>
                <h3 className="font-display text-[24px] text-ink mb-2">Select a Candidate</h3>
                <p className="font-sans text-[14px]">Click on a candidate card from the left panel to view their detailed profile.</p>
              </div>
            ) : (
              <div className="max-w-[800px] w-full mx-auto px-10 py-10 pb-24">
                {/* Profile Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-hairline">
                  <div>
                    <h2 className="font-display text-[36px] text-ink break-words line-clamp-2 leading-tight mb-2">{selectedCandidate.name}</h2>
                    <p className="font-sans text-[16px] text-body">{selectedCandidate.role}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 shrink-0 ml-6">
                    {selectedCandidate.status !== 'Evaluating' && (
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">AI Match Score</span>
                        <span className={`px-4 py-1.5 rounded-lg text-[24px] font-bold border shadow-sm ${selectedCandidate.score >= 70 ? 'bg-canvas text-ink border-ink' : 'bg-surface-card text-muted border-hairline'}`}>
                          {selectedCandidate.score}/100
                        </span>
                      </div>
                    )}
                    
                    {selectedCandidate.status === 'Shortlisted' && (
                       <Button 
                         onClick={() => handleScheduleInterview(selectedCandidate.id)}
                         disabled={isGeneratingLink}
                         className="mb-2 bg-ink text-canvas hover:bg-ink/90 flex items-center gap-2"
                       >
                         {isGeneratingLink ? <Loader2 className="animate-spin" size={16}/> : <Link size={16}/>}
                         Move to Interview & Generate Link
                       </Button>
                    )}

                    <div className="mt-2 text-right">
                       <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Pipeline Stage</span>
                       <select 
                          value={selectedCandidate.status} 
                          onChange={(e) => handleStatusChange(selectedCandidate.id, e.target.value)}
                          disabled={selectedCandidate.status === 'Evaluating'}
                          className="bg-canvas border border-ink text-ink text-[14px] font-bold rounded-lg px-4 py-2 focus:outline-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-8 relative"
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status} disabled={status === 'Evaluating' && selectedCandidate.status !== 'Evaluating'}>{status}</option>
                          ))}
                        </select>
                    </div>
                  </div>
                </div>

                {/* AI Interview Setup (if Interview stage) */}
                {selectedCandidate.status === 'Interview' && (
                  <div className="mb-8 p-6 bg-surface-card border-2 border-hairline-strong rounded-2xl shadow-sm transition-all animate-in fade-in zoom-in duration-500">
                    <h3 className="text-[14px] font-bold text-ink uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Link size={18} className="text-[#10b981]"/>
                      AI Interview Link Generated
                    </h3>
                    <p className="text-[13px] text-body mb-4 leading-relaxed">An automated email has been dispatched to <span className="font-bold text-ink">{selectedCandidate.email}</span> with this unique interview link. The AI agent is ready to conduct the interview.</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-canvas border border-hairline rounded-lg px-4 py-3 text-[14px] font-mono text-ink truncate select-all shadow-inner">
                        {selectedCandidate.generated_link || "Link will appear here... please wait or refresh."}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                           if(selectedCandidate.generated_link) {
                               navigator.clipboard.writeText(selectedCandidate.generated_link);
                               toast.success("Link Copied!");
                           }
                        }}
                        className="px-4 py-3 hover:shadow-md transition-all"
                      >
                        <Copy size={16} className="mr-2"/> Copy Link
                      </Button>
                    </div>
                  </div>
                )}

                {/* Profile Body */}
                <div className="space-y-8">
                  {selectedCandidate.status === 'Evaluating' ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-surface-card rounded-2xl border border-hairline shadow-sm text-center px-6">
                      <div className="flex items-center justify-center gap-2 relative group cursor-help mb-4">
                        <h3 className="font-sans font-medium text-ink text-[18px]">AI Evaluation in Progress</h3>
                        <Info size={18} className="text-muted group-hover:text-ink transition-colors" />
                        
                        {/* Hover Tooltip Card */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 hidden group-hover:block w-72 bg-ink text-canvas text-[13px] font-medium leading-relaxed p-4 rounded-xl shadow-xl z-50 text-left">
                          The agent is currently deeply analyzing the resume, extracting skills, and generating a tailored interview strategy...
                          {/* Triangle pointer */}
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink"></div>
                        </div>
                      </div>

                      <p className="text-[#10b981] font-bold text-[14px] bg-[#10b981]/10 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                        <CheckCircle2 size={16} /> Resume successfully queued for AI processing!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* AI Summary */}
                      <section>
                        <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.96px] mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-ink" /> AI Screening Summary</h3>
                        <div className="bg-surface-card border border-hairline p-6 rounded-2xl shadow-sm text-ink leading-relaxed text-[15px]">
                          {selectedCandidate.summary}
                        </div>
                      </section>

                      {/* HR Feedback */}
                      {selectedCandidate.feedback && (
                        <section>
                          <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.96px] mb-3">HR Feedback Synthesis</h3>
                          <div className="bg-canvas border-l-4 border-l-ink border border-hairline p-5 rounded-2xl shadow-sm text-ink leading-relaxed text-[15px] font-medium">
                            {selectedCandidate.feedback}
                          </div>
                        </section>
                      )}

                      {/* Skills Layout */}
                      <div className="grid grid-cols-2 gap-6">
                        <section className="bg-surface-card border border-hairline p-5 rounded-2xl shadow-sm">
                          <h4 className="text-[12px] font-bold text-muted uppercase tracking-[0.96px] mb-3 text-ink">Matched Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedCandidate.matching_skills?.length > 0 ? (
                               selectedCandidate.matching_skills.map((skill, idx) => (
                                 <span key={idx} className="bg-canvas border border-hairline text-[13px] font-medium px-2.5 py-1 rounded-md text-ink shadow-sm">{skill}</span>
                               ))
                            ) : <span className="text-[14px] text-body">None identified</span>}
                          </div>
                        </section>
                        <section className="bg-surface-card border border-hairline p-5 rounded-2xl shadow-sm">
                          <h4 className="text-[12px] font-bold text-muted uppercase tracking-[0.96px] mb-3 text-body">Missing Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedCandidate.missing_skills?.length > 0 ? (
                               selectedCandidate.missing_skills.map((skill, idx) => (
                                 <span key={idx} className="bg-canvas-soft border border-hairline text-[13px] px-2.5 py-1 rounded-md text-muted">{skill}</span>
                               ))
                            ) : <span className="text-[14px] text-body">None identified</span>}
                          </div>
                        </section>
                      </div>

                      {/* Recommended Questions */}
                      {selectedCandidate.questions?.length > 0 && (
                        <section>
                          <h3 className="text-[12px] font-bold text-muted uppercase tracking-[0.96px] mb-4">Recommended Interview Questions</h3>
                          <div className="space-y-3">
                            {selectedCandidate.questions.map((q, i) => (
                              <div key={i} className="p-4 bg-surface-card border border-hairline rounded-xl text-[14px] text-ink shadow-sm leading-relaxed flex gap-3">
                                <span className="font-bold text-ink/50 mt-0.5">Q{i + 1}</span> 
                                <span>{q}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Scheduling Action */}
                      {selectedCandidate.status === 'Interview' && (
                        <section className="pt-6 mt-6 border-t border-hairline">
                          {selectedCandidate.generated_link ? (
                            <div className="bg-canvas-soft border border-emerald-500/20 p-5 rounded-2xl shadow-sm">
                              <h4 className="text-[13px] font-bold text-emerald-600 uppercase tracking-[0.96px] mb-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Link Generated!</h4>
                              <div className="flex flex-col gap-3 mt-2">
                                 <input type="text" readOnly value={selectedCandidate.generated_link} className="w-full bg-canvas border border-hairline text-[14px] p-3 rounded-lg text-ink outline-none shadow-inner" />
                                 <Button onClick={() => { navigator.clipboard.writeText(selectedCandidate.generated_link); toast.success('Copied to clipboard!') }} className="w-full py-3 bg-ink text-canvas hover:bg-gray-800 transition-colors rounded-lg font-bold">Copy Link to Clipboard</Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleScheduleInterview(selectedCandidate.id)}
                              className="w-full py-4 text-[15px] bg-[#292524] text-white hover:bg-[#0c0a09] transition-all transform hover:scale-[1.01] shadow-lg rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                              Generate AI Interview Link
                            </Button>
                          )}
                        </section>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <UploadJDModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={fetchCandidates} />
    </DashboardLayout>
  );
}