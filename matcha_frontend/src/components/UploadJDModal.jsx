import React, { useState } from 'react';
import axios from 'axios';
import { X, UploadCloud, FileText } from 'lucide-react';

export default function UploadJDModal({ isOpen, onClose, onRefresh }) {
  const [jdTitle, setJdTitle] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', jdTitle);
    formData.append('file', jdFile);

    try {
      await axios.post('http://127.0.0.1:8000/api/upload-jd/', formData);
      onRefresh(); // Refresh the list in the dashboard
      onClose();   // Close the modal
    } catch (err) {
      console.error("Upload failed", err);
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

          <div>
            <label className="block text-sm font-semibold mb-1">JD Blueprint (PDF)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center hover:bg-slate-50 cursor-pointer">
              <UploadCloud className="text-slate-400 mb-2" />
              <input type="file" accept=".pdf" onChange={(e) => setJdFile(e.target.files[0])} className="text-sm" />
            </div>
          </div>

          <button 
            disabled={isUploading || !jdFile}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {isUploading ? "Provisioning..." : "Create Pipeline"}
          </button>
        </form>
      </div>
    </div>
  );
}