import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

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
      await axios.post('http://127.0.0.1:8000/api/upload-jd/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccess(true);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload JD. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-jd-title">
      <div className="modal-panel max-w-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 id="upload-jd-title" className="text-xl font-extrabold text-slate-900">New Job Pipeline</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="jd-title" className="field-label">Job Title</label>
            <input
              id="jd-title"
              required
              className="input-field"
              placeholder="e.g. Senior Backend Engineer"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadMethod === 'file' ? 'bg-white shadow-soft text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setUploadMethod('file')}
            >
              Upload PDF
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadMethod === 'text' ? 'bg-white shadow-soft text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setUploadMethod('text')}
            >
              Paste Text
            </button>
          </div>

          {uploadMethod === 'file' ? (
            <div>
              <label htmlFor="jd-file" className="field-label">JD Blueprint (PDF)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center hover:bg-slate-50 hover:border-green-400 transition-colors cursor-pointer">
                <UploadCloud className="text-slate-400 mb-2" size={28} />
                <input id="jd-file" type="file" accept=".pdf" onChange={(e) => setJdFile(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="jd-raw-text" className="field-label">Raw Job Description Text</label>
              <textarea
                id="jd-raw-text"
                className="input-field h-32 resize-none text-sm"
                placeholder="Paste the full job description text here..."
                value={jdRawText}
                onChange={(e) => setJdRawText(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="badge-red w-full justify-start py-2.5 px-4 rounded-xl">{error}</div>
          )}

          <button
            disabled={isUploading || (uploadMethod === 'file' ? !jdFile : !jdRawText)}
            className="btn-primary btn-md w-full mt-1"
          >
            {success ? (
              <span className="flex items-center gap-2"><CheckCircle2 size={18} /> Pipeline Created!</span>
            ) : isUploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white"></span>
                Provisioning...
              </span>
            ) : (
              <span className="flex items-center gap-2"><FileText size={18} /> Create Pipeline</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
