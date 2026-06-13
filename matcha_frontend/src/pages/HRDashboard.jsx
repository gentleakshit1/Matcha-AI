import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import UploadJDModal from '../components/UploadJDModal';
import { Users, FileText, CheckCircle2, UploadCloud, X, GripVertical, Trash2 } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS = [
  { id: 'Applied', title: 'Applied' },
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
      className={`bg-white p-4 rounded-xl border ${isDragging ? 'border-green-500 shadow-md ring-2 ring-green-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'} shadow-sm mb-3 group cursor-pointer relative flex gap-3 transition-colors duration-150`}
      onClick={() => onClick(candidate)}
    >
      <div {...attributes} {...listeners} className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="text-slate-400 hover:text-slate-700" size={18} />
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-slate-900">{candidate.name}</h4>
        <p className="text-xs text-slate-500 mb-2 truncate" title={candidate.role}>{candidate.role}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${candidate.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          AI Score: {candidate.score}
        </span>
      </div>
    </div>
  );
}

function DroppableColumn({ column, candidates, setSelectedCandidate }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`w-80 flex-shrink-0 bg-slate-100/80 rounded-2xl flex flex-col h-[calc(100vh-200px)] border ${isOver ? 'border-green-400 bg-green-50/30' : 'border-slate-200'} shadow-sm overflow-hidden transition-colors duration-200`}>
      <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50 shrink-0">
        <h3 className="font-bold text-slate-700 text-sm tracking-wide">{column.title}</h3>
        <span className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm">
          {candidates.length}
        </span>
      </div>

      <div className="p-3 flex-grow overflow-y-auto" ref={setNodeRef}>
        <SortableContext items={candidates.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
          {candidates.map(candidate => (
            <SortableCandidateCard key={candidate.id} candidate={candidate} onClick={setSelectedCandidate} />
          ))}
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

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://127.0.0.1:8000/api/get-candidates/');
      const data = Array.isArray(response.data) ? response.data : response.data.candidates || [];
      // Assign default status if missing
      const processedData = data.map(c => ({ ...c, status: c.status || 'Applied' }));
      setCandidates(processedData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setError("Unable to load candidate data from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

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
      await axios.post('http://127.0.0.1:8000/api/update-candidate-status/', {
        candidate_id: candidateId,
        status: newStatus
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
        await axios.delete(`http://127.0.0.1:8000/api/delete-candidate/${candidateId}/`);
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
      <div className="max-w-7xl mx-auto h-full flex flex-col pt-4">

        {/* HEADER SECTION */}
        <div className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight"></h2>
            <p className="text-slate-500 mt-1 text-sm">Manage pipelines and drag-and-drop candidates between stages.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold border border-green-200">
              Pass Threshold: 85/100
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <UploadCloud size={20} />
              New JD Pipeline
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium shrink-0 text-sm flex items-center gap-2"><X size={18} className="text-red-500" /> {error}</div>}

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
                  <div className="bg-white p-4 rounded-xl border-2 border-green-500 shadow-xl opacity-95 w-80 rotate-2 cursor-grabbing">
                    <h4 className="font-bold text-slate-900">{activeCandidate.name}</h4>
                    <p className="text-xs text-slate-500 mb-2 truncate">{activeCandidate.role}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeCandidate.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCandidate(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
              <div><h2 className="text-2xl font-bold">{selectedCandidate.name}</h2><p className="text-slate-500">{selectedCandidate.role}</p></div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors" title="Delete Candidate">
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-800 p-2"><X size={24} /></button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Current Stage:</span>
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">{selectedCandidate.status}</span>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Application Lifecycle</h3>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div>
                    <span className="text-xs mt-1 text-slate-500">Applied</span>
                  </div>
                  <div className="w-12 h-0.5 bg-green-200 -mt-4"></div>
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle2 size={14} /></div>
                    <span className="text-xs mt-1 text-slate-500">Evaluated</span>
                  </div>
                  <div className="w-12 h-0.5 bg-slate-200 -mt-4"></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedCandidate.status === 'Rejected' ? 'bg-red-500 text-white' : selectedCandidate.status === 'Applied' || selectedCandidate.status.includes('Screening') ? 'bg-slate-200 text-slate-400' : 'bg-green-500 text-white'}`}>
                      {selectedCandidate.status === 'Rejected' ? <X size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <span className={`text-xs mt-1 ${selectedCandidate.status === 'Rejected' ? 'text-red-500' : 'text-slate-500'}`}>
                      {selectedCandidate.status === 'Rejected' ? 'Rejected' : selectedCandidate.status === 'Applied' || selectedCandidate.status.includes('Screening') ? 'Pending' : 'Shortlisted'}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Screening Summary (Score: {selectedCandidate.score}/100)</h3>
              <p className="bg-slate-50 p-4 rounded-xl text-slate-700 mb-6">{selectedCandidate.summary}</p>

              {selectedCandidate.feedback && (
                <>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">HR Feedback Synthesis</h3>
                  <p className="bg-indigo-50 p-4 rounded-xl text-indigo-900 mb-6 font-medium">{selectedCandidate.feedback}</p>
                </>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 p-4 rounded-xl text-emerald-800 text-sm font-medium">✓ Matched: {selectedCandidate.matching_skills?.join(', ')}</div>
                <div className="bg-red-50 p-4 rounded-xl text-red-800 text-sm font-medium">✗ Missing: {selectedCandidate.missing_skills?.join(', ')}</div>
              </div>

              {selectedCandidate.questions?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recommended Interview Questions</h3>
                  {selectedCandidate.questions.map((q, i) => <div key={i} className="mb-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm">Q{i + 1}. {q}</div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}