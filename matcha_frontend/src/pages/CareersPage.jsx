import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, MapPin, Clock, ChevronDown, ChevronUp, FileText, ChevronRight, Edit2, X } from 'lucide-react';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/TextInput';

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
    localStorage.setItem('intended_job_id', jobId);
    if (isSignedIn) {
      navigate('/candidate');
    } else {
      openSignIn({ afterSignInUrl: '/candidate', afterSignUpUrl: '/candidate' });
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-ink">
      <TopNav />

      {/* HERO SECTION */}
      <div className="bg-canvas py-[96px] px-6 text-center relative overflow-hidden">
        <h2 className="font-display text-[48px] md:text-[64px] font-light tracking-tight mb-4">Open Positions</h2>
        <p className="text-body max-w-2xl mx-auto text-[16px] leading-[1.5]">
          Join our mission to revolutionize hiring with AI. Explore open roles below.
        </p>
      </div>

      <main className="max-w-[800px] mx-auto w-full px-6 pb-[96px] flex-1">
        <div className="flex flex-col gap-4">
          {availableJobs.length === 0 ? (
            <Card className="text-center flex flex-col items-center py-[48px]">
              <Briefcase size={40} className="text-muted-soft mb-4" />
              <p className="text-body font-sans text-[16px]">No open positions available at the moment.</p>
            </Card>
          ) : (
            availableJobs.map((job, index) => {
              const isExpanded = expandedJobId === job.id;
              const visualId = availableJobs.length - index;
              
              return (
                <Card 
                  key={job.id} 
                  className="cursor-pointer hover:border-ink transition-colors group p-0 overflow-hidden" 
                  onClick={(e) => toggleJobExpand(job.id, e)}
                >
                  <div className="p-[24px]">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-[20px] font-medium font-sans text-ink flex items-center gap-3">
                        <span className="text-[12px] font-semibold tracking-[0.96px] uppercase bg-canvas-soft text-muted px-2 py-1 rounded-[4px] border border-hairline-soft">#{visualId}</span>
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {user?.publicMetadata?.role === 'hr' && (
                          <>
                            <button 
                              onClick={(e) => handleEditClick(job, e)}
                              className="text-[13px] font-medium text-muted hover:text-ink transition-colors flex items-center gap-1 bg-canvas-soft px-3 py-1 rounded-pill"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={(e) => handleDelete(job.id, e)}
                              className="text-[13px] font-medium text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1 rounded-pill"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <button className="text-muted group-hover:text-ink transition-colors ml-2">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-[14px] text-body">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={16} className="text-muted-soft"/> Remote / Hybrid
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} className="text-muted-soft"/> Full-time
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-hairline bg-canvas-soft p-[24px]">
                      <h5 className="font-sans font-medium text-[16px] text-ink flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-muted" />
                        About the Role
                      </h5>
                      <div className="prose prose-sm prose-slate max-w-none mb-6">
                        {job.raw_text ? (
                          <p className="whitespace-pre-wrap text-[15px] leading-[1.6] text-body">{job.raw_text}</p>
                        ) : (
                          <p className="text-muted-soft italic text-[15px]">Job description details are currently unavailable.</p>
                        )}
                      </div>
                      <Button 
                        onClick={(e) => { e.stopPropagation(); handleApply(job.id); }}
                        className="w-full"
                      >
                        Apply for this Role
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>

      <Footer />

      {/* Edit JD Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-surface-dark/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-3xl font-light text-ink">Edit Job Description</h2>
              <button onClick={() => setEditingJob(null)} className="p-2 text-muted hover:text-ink transition-colors rounded-full hover:bg-canvas-soft"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditSave} className="flex flex-col gap-6">
              <div>
                <label className="block font-sans text-[15px] font-medium text-ink mb-2">Job Title</label>
                <TextInput 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-sans text-[15px] font-medium text-ink mb-2">Raw Job Description Text</label>
                <textarea 
                  required
                  className="w-full p-4 border border-hairline-strong rounded-[8px] h-[300px] resize-none focus:outline-none focus:border-[2px] focus:border-ink transition-all text-[15px] leading-[1.6] bg-surface-card text-ink font-sans"
                  value={editRawText}
                  onChange={(e) => setEditRawText(e.target.value)}
                />
                <p className="text-[13px] text-muted mt-2">
                  Saving this will automatically re-train the AI agent with the new description. Existing evaluations will not be re-scored.
                </p>
              </div>

              <div className="flex gap-4 w-full mt-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditingJob(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Updating AI Agent..." : "Save & Sync with AI"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
