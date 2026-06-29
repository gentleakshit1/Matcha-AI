import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, AlertTriangle, Video } from 'lucide-react';
import ProctoringEngine from '../components/ProctoringEngine';

export default function InterviewPortal() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [warningMessage, setWarningMessage] = useState(null);
  const [warningsCount, setWarningsCount] = useState(0);
  const [proctoringLog, setProctoringLog] = useState([]);
  
  // WebRTC Refs
  const videoRef = useRef(null); // Used for Proctoring

  useEffect(() => {
    // Validate the session token with the Backend
    const fetchToken = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/interviews/get_token/${token}/`);
        setSessionData(response.data);
      } catch (err) {
        console.error("Session Error:", err);
        setError("Invalid or expired interview session.");
      }
    };
    fetchToken();
  }, [token]);

  const startInterview = async () => {
    if (!sessionData) {
      alert("Please wait for the session to load.");
      return;
    }

    try {
      // Capture User's Video for proctoring (hidden from UI)
      const ms = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
      }

      setIsConnected(true);
      // Open Amrita in a new tab
      window.open("https://bey.chat/20764bff-99a2-49a8-893b-5f15b72620b0", "_blank");
    } catch (err) {
      console.error("Failed to start interview:", err);
      alert("Could not access camera for proctoring. Camera access is required.");
    }
  };

  const endInterview = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsConnected(false);
    navigate('/');
  };

  const handleWarning = (msg) => {
    if (warningMessage) return; // don't stack warnings
    setWarningMessage(msg);
    setWarningsCount(prev => prev + 1);
    setProctoringLog(prev => [...prev, { time: new Date().toISOString(), violation: msg }]);
  };

  const clearWarning = () => setWarningMessage(null);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center font-sans">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Session Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white flex flex-col font-sans overflow-hidden relative">
      
      {/* Hidden Video element for Proctoring Engine (Must be full size but off-screen for TFJS to detect faces properly) */}
      <video ref={videoRef} autoPlay playsInline muted className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none" />
      <ProctoringEngine videoRef={videoRef} onWarning={handleWarning} isRunning={isConnected && !warningMessage} />

      {/* Warning Overlay */}
      {warningMessage && (
        <div className="absolute inset-0 z-50 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
          <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
          <h2 className="text-4xl font-bold text-white mb-4">Proctoring Warning</h2>
          <p className="text-xl text-red-200 mb-8 max-w-lg">{warningMessage}</p>
          <button 
            onClick={clearWarning}
            className="bg-white text-red-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-red-100 transition-colors"
          >
            I Understand, Resume Interview
          </button>
        </div>
      )}

      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full filter blur-[120px] opacity-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-1000 ${isConnected ? 'bg-indigo-500' : 'bg-gray-800'}`}></div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white text-lg">M</div>
          <span className="font-medium tracking-wide">AI Interviewer</span>
        </div>
        <div className="text-sm font-medium text-gray-400">
          {isConnected ? <span className="text-emerald-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Session</span> : 'Ready to begin'}
        </div>
        {isConnected && (
           <button 
            onClick={endInterview}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            End Interview
          </button>
        )}
      </header>

      {/* Main UI */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 pb-8">
        
        {isConnected ? (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center px-6 py-12 bg-gray-900/50 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-sm">
             <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
               <Activity className="text-indigo-400 w-12 h-12 animate-pulse" />
             </div>
             <h2 className="text-4xl font-bold mb-6 text-white">Interview in Progress</h2>
             <p className="text-xl text-gray-300 mb-8 w-full leading-relaxed">
               Your interview with Amrita has been opened in a new tab. 
               <br /><br />
               <span className="text-red-400 font-bold bg-red-900/20 px-3 py-1 rounded">⚠️ Do not close this page.</span> 
               <br /><br />
               Our proctoring engine is running in the background to ensure the integrity of your session.
             </p>
             <button 
               onClick={() => window.open("https://bey.chat/20764bff-99a2-49a8-893b-5f15b72620b0", "_blank")}
               className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium underline px-4 py-2 hover:bg-indigo-900/30 rounded-lg transition-colors"
             >
               Click here if the new tab didn't open automatically
             </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-12 relative flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-gray-800 flex items-center justify-center bg-gray-900">
                <Video className="text-gray-600 w-16 h-16" />
              </div>
            </div>
            <button 
              onClick={startInterview}
              disabled={!sessionData}
              className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-transform transform hover:scale-105 disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Start Interview
            </button>
            {!sessionData && (
              <p className="mt-4 text-gray-500 text-sm animate-pulse">Validating session...</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
