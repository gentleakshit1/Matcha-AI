import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function UploadJDModal({ isOpen, onClose, onRefresh }) {
  const [jdTitle, setJdTitle] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'text'
  const [jdFile, setJdFile] = useState(null);
  const [jdRawText, setJdRawText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const { getToken } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('title', jdTitle);
    
    if (uploadMethod === 'file') {
      formData.append('file', jdFile);
    } else {
      formData.append('raw_text', jdRawText);
    }

    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/upload-jd/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccess(true);
      setTimeout(() => {
        onRefresh();
        onClose();
        // Reset state after closing
        setTimeout(() => {
          setSuccess(false);
          setJdTitle('');
          setJdFile(null);
          setJdRawText('');
        }, 300);
      }, 500);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload JD. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-[500px] max-w-[95vw] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
        <div className="flex justify-between items-center px-8 py-6 border-b border-hairline bg-canvas">
          <h2 className="font-display text-[28px] text-ink tracking-tight">New Job Pipeline</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-2 transition-colors rounded-full hover:bg-canvas-soft"><X size={24} /></button>
        </div>

        <div className="p-8 bg-canvas-soft">
          {success ? (
             <div className="flex flex-col items-center justify-center text-center py-12 px-6">
               <div className="relative mb-8">
                 <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse-slow"></div>
                 <div className="w-20 h-20 bg-canvas border-2 border-green-500/30 rounded-full flex items-center justify-center relative z-10 shadow-sm">
                   <CheckCircle2 className="text-green-600" size={40} strokeWidth={2.5} />
                 </div>
               </div>
               <h4 className="text-[32px] font-display text-ink mb-4 tracking-tight">Pipeline Created!</h4>
               <p className="text-body text-[16px] max-w-xs mx-auto leading-relaxed">
                 Your new job pipeline is provisioned and ready to start evaluating candidates.
               </p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {error && (
                <div className="p-3 bg-canvas border border-hairline text-ink rounded-lg font-medium text-[14px] shadow-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[14px] font-medium text-ink mb-2">Job Title</label>
                <input 
                  required
                  className="w-full p-3 bg-canvas border border-hairline rounded-xl focus:outline-none focus:border-ink transition-colors text-[14px] text-ink"
                  placeholder="e.g. Senior Backend Engineer"
                  value={jdTitle}
                  onChange={(e) => setJdTitle(e.target.value)}
                />
              </div>

              <div className="flex bg-surface-card p-1 rounded-xl border border-hairline">
                <button 
                  type="button"
                  className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${uploadMethod === 'file' ? 'bg-canvas shadow-sm text-ink border border-hairline' : 'text-muted hover:text-ink border border-transparent'}`}
                  onClick={() => setUploadMethod('file')}
                >
                  Upload PDF
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${uploadMethod === 'text' ? 'bg-canvas shadow-sm text-ink border border-hairline' : 'text-muted hover:text-ink border border-transparent'}`}
                  onClick={() => setUploadMethod('text')}
                >
                  Paste Text
                </button>
              </div>

              {uploadMethod === 'file' ? (
                <div>
                  <label className="block text-[14px] font-medium text-ink mb-2">JD Blueprint (PDF)</label>
                  <label 
                    className="border border-dashed border-hairline-strong rounded-xl p-8 flex flex-col items-center justify-center hover:bg-canvas transition-colors cursor-pointer bg-surface-card"
                  >
                    <div className={`p-4 rounded-full mb-4 transition-colors ${jdFile ? 'bg-canvas-soft text-ink border border-hairline' : 'bg-canvas text-muted border border-transparent'}`}>
                      {jdFile ? <FileText size={24} /> : <UploadCloud size={24} />}
                    </div>
                    {jdFile ? (
                      <p className="text-[14px] font-medium text-ink truncate max-w-xs">{jdFile.name}</p>
                    ) : (
                      <>
                        <p className="text-[14px] text-ink font-medium mb-1">Click to browse files</p>
                        <p className="text-[13px] text-muted">PDF files only</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setJdFile(e.target.files[0])} 
                      className="hidden" 
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-[14px] font-medium text-ink mb-2">Raw Job Description Text</label>
                  <textarea 
                    className="w-full p-3 bg-canvas border border-hairline rounded-xl h-32 resize-none focus:outline-none focus:border-ink transition-colors text-[14px] text-ink"
                    placeholder="Paste the full job description text here..."
                    value={jdRawText}
                    onChange={(e) => setJdRawText(e.target.value)}
                  />
                </div>
              )}

              <Button 
                type="submit"
                disabled={isUploading || (uploadMethod === 'file' ? !jdFile : !jdRawText)}
                className="w-full py-4 mt-2 h-auto"
              >
                {isUploading ? "Provisioning Pipeline..." : "Create Pipeline"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}