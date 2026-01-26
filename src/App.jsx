import React, { useState, useEffect } from 'react';
import { VolleyballDataProvider } from './context/VolleyballContext';

// Components
import Dashboard from './components/Dashboard';
import TeamManager from './components/TeamManager';
import RefereeManager from './components/RefereeManager';
import ControlPanel from './components/ControlPanel';

// Overlays
import CavaClubOverlay from './overlays/CavaClubOverlay';       
import CavaNationsOverlay from './overlays/CavaNationsOverlay'; 
import StadiumView from './overlays/StadiumView';              

const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Oswald:wght@400;600;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .font-black { font-weight: 900; }
        
        /* Shared Animations */
        @keyframes flash-timeout { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-flash-timeout { animation: flash-timeout 1s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        @keyframes score-pop { 0% { transform: scale(1.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-score-pop { animation: score-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes scale-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }
        @keyframes slide-in-left { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-in-left { animation: slide-in-left 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes slide-in-right { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-in-right { animation: slide-in-right 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    `}</style>
);

export default function App() {
    const [view, setView] = useState('dashboard');
    const [activeMatchId, setActiveMatchId] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paramView = params.get('view');
        const paramMatchId = params.get('matchId');

        if (paramView) {
            setView(paramView);
            if (paramMatchId) setActiveMatchId(paramMatchId);
        }
    }, []);

    const navigate = (id, viewName) => {
        setActiveMatchId(id);
        setView(viewName);
    };

    const isOverlayView = ['output', 'stadium', 'scorebar', 'cava_output'].includes(view);

    return (
        <VolleyballDataProvider>
            <GlobalStyles />
            <div className={`min-h-screen ${isOverlayView ? 'bg-transparent' : 'bg-slate-100 text-slate-900'}`}>
                {view === 'dashboard' && (
                    <Dashboard 
                        onControl={(id) => navigate(id, 'control')} 
                        onOutput={(id) => navigate(id, 'output')} 
                        onStadium={(id) => navigate(id, 'stadium')} 
                        onManageTeams={() => setView('teams')} 
                        onManageReferees={() => setView('referees')} 
                    />
                )}
                {view === 'teams' && <TeamManager onBack={() => setView('dashboard')} />}
                {view === 'referees' && <RefereeManager onBack={() => setView('dashboard')} />}
                {view === 'control' && activeMatchId && (
                    <ControlPanel 
                        matchId={activeMatchId} 
                        onBack={() => setView('dashboard')} 
                    />
                )}
                {view === 'output' && activeMatchId && (
                    <CavaNationsOverlay matchId={activeMatchId} />
                )}
                {(view === 'scorebar' || view === 'cava_output') && activeMatchId && (
                    <CavaClubOverlay matchId={activeMatchId} />
                )}
                {view === 'stadium' && activeMatchId && (
                    <StadiumView matchId={activeMatchId} />
                )}
                {(!activeMatchId && view !== 'dashboard' && view !== 'teams' && view !== 'referees') && (
                    <div className="h-screen flex items-center justify-center text-white bg-slate-900">
                        <div className="text-center">
                            <h2 className="text-xl font-bold mb-2">No Match Selected</h2>
                            <p className="text-slate-400">Please return to dashboard or check URL parameters.</p>
                            <button onClick={() => setView('dashboard')} className="mt-4 px-4 py-2 bg-blue-600 rounded font-bold">Go to Dashboard</button>
                        </div>
                    </div>
                )}
            </div>
        </VolleyballDataProvider>
    );
}