import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import UploadJDModal from '../components/UploadJDModal';
import { Users, FileText, CheckCircle2, UploadCloud, X, GripVertical, Trash2, ShieldCheck } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS = [
  { id: 'Evaluating', title: 'Evaluating (AI)' },
  { id: 'Shortlisted', title: 'Shortlisted' },
  { id: 'Interview', title: 'Interview' },
  { id: 'Rejected', title: 'Rejected' },
];

function SortableCandidateCard({ candidate, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id.toString(), data: { candidate } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-xl border ${isDragging ? 'border-green-500 shadow-soft-lg ring-2 ring-green-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-soft'} shadow-soft mb-3 group cursor-pointer relative flex gap-3 transition-all duration-150`}
      onClick={() => onClick(candidate)}
    >
      <div {...attributes} {...listeners} className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="text-slate-400 hover:text-slate-700" size={18} />
      </div>
      <div className="flex-grow min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{candidate.name}</h4>
        <p className="text-xs text-slate-500 mb-2.5 truncate" title={candidate.role}>{candidate.role}</p>
        {candidate.status === 'Evaluating' ? (
          <span className="badge-blue w-fit">
            <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            Pending
          </span>
        ) : (
          <span className={`badge w-fit ${candidate.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            AI Score: {candidate.score}
          </span>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ column, candidates, setSelectedCandidate }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`w-80 flex-shrink-0 bg-slate-100/70 rounded-2xl flex flex-col h-[calc(100vh-220px)] border ${isOver ? 'border-green-400 bg-green-50/40' : 'border-slate-200'} shadow-soft overflow-hidden transition-colors duration-200`}>
      <div className="p-4 border-b border-slate-200/70 flex justify-between items-center bg-white/60 shrink-0">
        <h3 className="font-extrabold text-slate-700 text-sm tracking-wide">{column.title}</h3>
        <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-soft">
          {candidates.length}
        </span>
      </div>

      <div className="p-3 flex-grow overflow-y-auto custom-scrollbar" ref={setNodeRef}>
        <SortableContext items={candidates.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
          {candidates.map(candidate => (
            <SortableCandidateCard key={candidate.id} candidate={candidate} onClick={setSelectedCandidate} />
          ))}
          {candidates.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8 px-2 border border-dashed border-slate-200 rounded-xl">
              No candidates here yet
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function HRDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const { getToken, isLoaded } = useAuth();
  const navigate = useNavigate();

  const fetchCandidates = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setIsLoading(true);
      const token = await getToken();
      if (!token) return; // Wait until token exists
      const response = await axios.get('http://127.0.0.1:8000/api/get-candidates/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(response.data) ? response.data : response.data.candidates || [];
      // Assign default status if missing
      const processedData = data.map(c => ({ ...c, status: c.status || 'Applied' }));
      setCandidates(processedData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      // Remove the redirect to /candidate so we can see what the actual error is!
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const candidateId = parseInt(active.id);

    // Check if over is a column or another card
    let newStatus = over.id;
    // If it's a card, over.data.current.sortable.containerId will contain the column id
    if (over.data?.current?.sortable?.containerId) {
      newStatus = over.data.current.sortable.containerId;
    }

    // Ensure the newStatus is a valid column ID
    if (!COLUMNS.find(c => c.id === newStatus)) {
      return;
    }

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.status === newStatus) return;

    // Optimistic UI update
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));

    // Persist to backend
    try {
      const token = await getToken();
      await axios.post('http://127.0.0.1:8000/api/update-candidate-status/', {
        candidate_id: candidateId,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Failed to save candidate status change.");
      fetchCandidates(); // Revert on failure
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (window.confirm("Are you sure you want to delete this candidate?")) {
      try {
        const token = await getToken();
        await axios.delete(`http://127.0.0.1:8000/api/delete-candidate/${candidateId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
        setSelectedCandidate(null);
      } catch (err) {
        console.error("Failed to delete candidate:", err);
        setError("Failed to delete candidate.");
      }
    }
  };

  const getCandidatesByStatus = (status) => candidates.filter(c => c.status === status);
  const activeCandidate = activeId ? candidates.find(c => c.id.toString() === activeId.toString()) : null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto h-full flex flex-col">

        {/* HEADER SECTION */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6 shrink-0">
          <div>
            <p className="label-eyebrow mb-2">Hiring Pipeline</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Candidate Pipeline</h2>
            <p className="text-slate-500 mt-1 text-sm">Manage pipelines and drag-and-drop candidates between stages.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="badge-green border border-green-200 px-4 py-2 rounded-xl">
              <ShieldCheck size={15} /> Pass Threshold: 85/100
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary btn-md"
            >
              <UploadCloud size={18} />
              New JD Pipeline
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold shrink-0 text-sm flex items-center gap-2">
            <X size={18} className="text-red-500 shrink-0" /> {error}
          </div>
        )}

        {/* KANBAN BOARD AREA */}
        <div className="flex-grow overflow-x-auto overflow-y-hidden pb-8 custom-scrollbar">
          {isLoading ? (
            <div className="text-slate-500 text-center py-20 flex flex-col items-center justify-center gap-4">
              <span className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-green-600"></span>
              Loading your pipeline data...
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="flex gap-5 h-full px-1 min-w-max">
                {COLUMNS.map((column) => (
                  <DroppableColumn
                    key={column.id}
                    column={column}
                    candidates={getCandidatesByStatus(column.id)}
                    setSelectedCandidate={setSelectedCandidate}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeCandidate ? (
                  <div className="bg-white p-4 rounded-xl border-2 border-green-500 shadow-soft-lg opacity-95 w-80 rotate-2 cursor-grabbing">
                    <h4 className="font-bold text-slate-900">{activeCandidate.name}</h4>
                    <p className="text-xs text-slate-500 mb-2 truncate">{activeCandidate.role}</p>
                    <span className={`badge ${activeCandidate.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      AI Score: {activeCandidate.score}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* MODALS */}
      <UploadJDModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={fetchCandidates} />

      {selectedCandidate && (
        <div className="modal-backdrop" onClick={() => setSelectedCandidate(null)} role="dialog" aria-modal="true">
          <div className="modal-panel max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{selectedCandidate.name}</h2>
                <p className="text-slate-500">{selectedCandidate.role}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-600 p-2 rounded-lg transition-colors" title="Delete Candidate" aria-label="Delete candidate">
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors" aria-label="Close">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="mb-6 flex items-center gap-2">
                <span className="label-eyebrow text-slate-400">Current Stage:</span>
                <span className="badge-indigo">{selectedCandidate.status}</span>
              </div>

              <div className="mb-8">
                <h3 className="label-eyebrow text-slate-400 mb-3">Application Lifecycle</h3>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div>
                    <span className="text-xs mt-1 text-slate-500">Evaluating</span>
                  </div>
                  <div className="w-12 h-0.5 bg-green-200 -mt-4"></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedCandidate.status === 'Evaluating' ? 'bg-slate-200 text-slate-400' : 'bg-green-500 text-white'}`}>
                      {selectedCandidate.status === 'Evaluating' ? <CheckCircle2 size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <span className={`text-xs mt-1 ${selectedCandidate.status === 'Evaluating' ? 'text-slate-400' : 'text-slate-500'}`}>Shortlisted</span>
                  </div>
                  <div className="w-12 h-0.5 bg-slate-200 -mt-4"></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedCandidate.status === 'Rejected' ? 'bg-red-500 text-white' : ['Evaluating', 'Shortlisted'].includes(selectedCandidate.status) ? 'bg-slate-200 text-slate-400' : 'bg-green-500 text-white'}`}>
                      {selectedCandidate.status === 'Rejected' ? <X size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <span className={`text-xs mt-1 ${selectedCandidate.status === 'Rejected' ? 'text-red-500' : 'text-slate-500'}`}>
                      {selectedCandidate.status === 'Rejected' ? 'Rejected' : ['Evaluating', 'Shortlisted'].includes(selectedCandidate.status) ? 'Pending' : 'Interview'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCandidate.status === 'Evaluating' ? (
                <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mb-4"></div>
                  <h3 className="font-bold text-slate-700">AI Evaluation in Progress</h3>
                  <p className="text-sm text-slate-500">The agent is currently analyzing the resume...</p>
                </div>
              ) : (
                <>
                  <h3 className="label-eyebrow text-slate-400 mb-2">AI Screening Summary (Score: {selectedCandidate.score}/100)</h3>
                  <p className="bg-slate-50 p-4 rounded-xl text-slate-700 mb-6 leading-relaxed">{selectedCandidate.summary}</p>

                  {selectedCandidate.feedback && (
                    <>
                      <h3 className="label-eyebrow text-slate-400 mb-2">HR Feedback Synthesis</h3>
                      <p className="bg-indigo-50 p-4 rounded-xl text-indigo-900 mb-6 font-medium leading-relaxed">{selectedCandidate.feedback}</p>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-50 p-4 rounded-xl text-emerald-800 text-sm font-medium">✓ Matched: {selectedCandidate.matching_skills?.join(', ')}</div>
                    <div className="bg-red-50 p-4 rounded-xl text-red-800 text-sm font-medium">✗ Missing: {selectedCandidate.missing_skills?.join(', ')}</div>
                  </div>

                  {selectedCandidate.questions?.length > 0 && (
                    <div>
                      <h3 className="label-eyebrow text-slate-400 mb-4">Recommended Interview Questions</h3>
                      {selectedCandidate.questions.map((q, i) => (
                        <div key={i} className="mb-3 p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 shadow-soft">Q{i + 1}. {q}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
