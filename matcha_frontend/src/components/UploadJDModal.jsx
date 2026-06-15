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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">New Job Pipeline</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Job Title</label>
            <input 
              required
              className="w-full p-3 border rounded-lg"
              placeholder="e.g. Senior Backend Engineer"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg mb-2">
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${uploadMethod === 'file' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setUploadMethod('file')}
            >
              Upload PDF
            </button>
            <button 
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${uploadMethod === 'text' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setUploadMethod('text')}
            >
              Paste Text
            </button>
          </div>

          {uploadMethod === 'file' ? (
            <div>
              <label className="block text-sm font-semibold mb-1">JD Blueprint (PDF)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center hover:bg-slate-50 cursor-pointer">
                <UploadCloud className="text-slate-400 mb-2" />
                <input type="file" accept=".pdf" onChange={(e) => setJdFile(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold mb-1">Raw Job Description Text</label>
              <textarea 
                className="w-full p-3 border rounded-lg h-32 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm"
                placeholder="Paste the full job description text here..."
                value={jdRawText}
                onChange={(e) => setJdRawText(e.target.value)}
              />
            </div>
          )}

          <button 
            disabled={isUploading || (uploadMethod === 'file' ? !jdFile : !jdRawText)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 mt-2"
          >
            {isUploading ? "Provisioning..." : "Create Pipeline"}
          </button>
        </form>
      </div>
    </div>
  );
}