import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    Trophy, Monitor, Users, Tv, Plus, Minus, ArrowLeftRight, Trash2,
    Activity, Save, Flag, Image as ImageIcon, UserPlus, Settings, X,
    Upload, User, ChevronLeft, LayoutGrid, Calendar, Clock, Download,
    FileJson, CheckCircle, History, Palette, Timer, Maximize2, Eye,
    EyeOff, Shield, UserCheck, Play, SkipForward, Wifi, WifiOff, Server as ServerIcon, Globe,
    Link as LinkIcon, Copy, ToggleLeft, ToggleRight, List, RotateCcw,
    Video as VideoIcon, DollarSign, Edit, Share2, Medal, BarChart3, AlertTriangle, RefreshCw, ArrowUpCircle, ArrowDownCircle, Repeat
} from 'lucide-react';

const GlobalStyles = () => (
    <style>{`
    @keyframes flash-timeout {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-flash-timeout {
      animation: flash-timeout 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin-slow {
      animation: spin-slow 3s linear infinite;
    }
    @keyframes score-pop {
      0% { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .animate-score-pop {
      animation: score-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes slide-in-left {
      0% { transform: translateX(-100px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in-left {
        animation: slide-in-left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes scale-in {
        0% { transform: scale(0.9); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
        animation: scale-in 0.5s ease-out;
    }
    @keyframes fade-cycle {
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
    }
    .animate-fade-cycle {
        animation: fade-cycle 5s infinite;
    }
    @keyframes gradient-bg {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .animate-gradient-bg {
        background: linear-gradient(-45deg, #0f172a, #1e1b4b, #312e81, #020617);
        background-size: 400% 400%;
        animation: gradient-bg 15s ease infinite;
    }
    .bg-carbon {
        background-image: linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111), 
                          linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111);
        background-color: #1a1a1a;
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
    }
    /* Scrollbar for Public Page */
    .public-scroll::-webkit-scrollbar { width: 6px; }
    .public-scroll::-webkit-scrollbar-track { background: transparent; }
    .public-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
  `}</style>
);

// --- Helper: Contrast Text Color ---
const getTextColor = (hex) => {
    if (!hex) return '#ffffff';
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#0f172a' : '#ffffff';
};

// --- Sync Hook (Socket.IO Only - Stabilized for Large Data) ---
function useSyncedState(key, defaultValue) {
    const [value, setValue] = useState(defaultValue);
    const [status, setStatus] = useState('disconnected');
    const [isSocketLoaded, setIsSocketLoaded] = useState(false);

    const socketRef = useRef(null);
    const ignoreRemoteRef = useRef(false);
    const timeoutRef = useRef(null);
    const emitDebounceRef = useRef(null);

    const [serverUrl, setServerUrl] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const paramServer = params.get('server');
        if (paramServer) {
            window.localStorage.setItem('volleyball_server_url', paramServer);
            return paramServer;
        }
        return window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
    });

    // Load Socket.IO Script Dynamically
    useEffect(() => {
        if (typeof window.io !== 'undefined') {
            setIsSocketLoaded(true);
        } else {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.min.js";
            script.async = true;
            script.onload = () => setIsSocketLoaded(true);
            script.onerror = () => console.error("Failed to load socket.io script");
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (!isSocketLoaded) return;

        if (!socketRef.current) {
            try {
                socketRef.current = window.io(serverUrl, {
                    reconnectionAttempts: 20,
                    reconnectionDelay: 1000,
                    transports: ['websocket'], // Force websocket
                    upgrade: false,
                    timeout: 60000
                });
            } catch (e) {
                console.error("Socket init failed", e);
                setStatus('error');
                return;
            }
        }

        const socket = socketRef.current;

        const onConnect = () => {
            console.log(`✅ Connected: ${key}`);
            setStatus('connected');
        };
        const onDisconnect = (reason) => {
            console.warn(`❌ Disconnected: ${key} (${reason})`);
            setStatus('disconnected');
            if (reason === "transport close" || reason === "ping timeout") {
                // Usually means packet was too big
                console.warn("⚠️ Connection dropped likely due to data size.");
            }
        };
        const onError = () => setStatus('error');

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onError);

        socket.on('init_state', (allData) => {
            if (allData && allData[key] !== undefined && !ignoreRemoteRef.current) {
                setValue(allData[key]);
            }
        });

        socket.on('sync_update', (data) => {
            if (data.key === key && !ignoreRemoteRef.current) {
                setValue(data.value);
            }
        });

        if (socket.connected) setStatus('connected');

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onError);
        };
    }, [key, serverUrl, isSocketLoaded]);

    // Setter Function
    const setSharedValue = (newValue) => {
        // 1. Optimistic Update
        setValue(newValue);

        // 2. Set Grace Period
        ignoreRemoteRef.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            ignoreRemoteRef.current = false;
        }, 2000);

        // 3. Debounced Emit
        if (emitDebounceRef.current) clearTimeout(emitDebounceRef.current);

        emitDebounceRef.current = setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
                const payload = { key, value: newValue };
                // Send data
                socketRef.current.emit('update_data', payload);
            } else {
                console.warn("Socket disconnected. Reconnecting...");
                if (socketRef.current) socketRef.current.connect();
                setTimeout(() => {
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('update_data', { key, value: newValue });
                    } else {
                        alert(`⚠️ Connection Failed. Data for [${key}] saved LOCALLY only (until refresh). Check Server Console.`);
                    }
                }, 1000);
            }
        }, 200); // Increased debounce slightly
    };

    return [value, setSharedValue, status];
}

// --- UPDATED File/Image Processing (Safer Limits) ---
const processFile = (file, callback, maxWidth = 200) => {
    if (!file) return;

    // Hard limit 100MB to prevent browser crash before sending
    if (file.size > 100 * 1024 * 1024) {
        alert("⚠️ File too large! Please use a file under 100MB.");
        return;
    }

    // Videos
    if (file.type.startsWith('video/')) {
        if (file.size > 20 * 1024 * 1024) {
            if (!confirm("⚠️ Large Video Detected (>20MB).\n\nUploading this might crash the connection if the server limit isn't configured correctly.\n\nContinue?")) return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => callback(e.target.result);
        return;
    }

    // Images - Resized and Compressed
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Compress to 0.6 quality JPEG
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
};

// --- DATA CONTEXT (GLOBAL STATE) ---
const DataContext = React.createContext(null);

function VolleyballDataProvider({ children }) {
    // We instantiate the sync hooks HERE, at the top level
    // This ensures data persists even when you switch views (Dashboard <-> TeamManager)
    const [matches, setMatches, matchStatus] = useSyncedState('volleyball_matches', []);
    const [teams, setTeams, teamStatus] = useSyncedState('volleyball_teams', []);
    const [referees, setReferees, refStatus] = useSyncedState('volleyball_referees', []);

    // Helper to get overall connection status
    const status = (matchStatus === 'connected' || teamStatus === 'connected') ? 'connected' : 'disconnected';

    return (
        <DataContext.Provider value={{
            matches, setMatches,
            teams, setTeams,
            referees, setReferees,
            status
        }}>
            {children}
        </DataContext.Provider>
    );
}

// Helper hook for children to use
const useVolleyballData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useVolleyballData must be used within a VolleyballDataProvider");
    }
    return context;
};


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

    const handleGoToView = (id, viewName) => {
        setActiveMatchId(id);
        setView(viewName);
    }

    return (
        <VolleyballDataProvider>
            <div className={`min-h-screen ${['output', 'stadium'].includes(view) ? 'bg-transparent' : 'bg-slate-100 font-sans'}`}>
                <GlobalStyles />
                {view === 'dashboard' && <Dashboard onControl={(id) => handleGoToView(id, 'control')} onOutput={(id) => handleGoToView(id, 'output')} onStadium={(id) => handleGoToView(id, 'stadium')} onManageTeams={() => setView('teams')} onManageReferees={() => setView('referees')} />}
                {view === 'teams' && <TeamManager onBack={() => setView('dashboard')} />}
                {view === 'referees' && <RefereeManager onBack={() => setView('dashboard')} />}
                {view === 'control' && activeMatchId && <ControlPanel matchId={activeMatchId} onBack={() => setView('dashboard')} />}
                {view === 'output' && activeMatchId && <BroadcastOverlay matchId={activeMatchId} onBack={() => setView('dashboard')} />}
                {view === 'stadium' && activeMatchId && <StadiumView matchId={activeMatchId} onBack={() => setView('dashboard')} />}
                {view === 'public' && <PublicPortal />}
            </div>
        </VolleyballDataProvider>
    );
}

// --- PUBLIC PORTAL (Redesigned Dashboard) ---
function PublicPortal() {
    const { matches, teams } = useVolleyballData();
    const [showAllResults, setShowAllResults] = useState(false);
    const [showAllSchedule, setShowAllSchedule] = useState(false);

    const matchList = Array.isArray(matches) ? matches : [];
    const teamList = Array.isArray(teams) ? teams : [];

    // --- Standings Calculation ---
    const calculateStandings = () => {
        const stats = {};
        teamList.forEach(t => {
            stats[t.id] = {
                ...t,
                played: 0, won: 0, lost: 0, points: 0,
                setsWon: 0, setsLost: 0,
                pointsWon: 0, pointsLost: 0
            };
        });

        matchList.filter(m => m.status === 'Finished').forEach(m => {
            const tA = stats[m.teamA.id];
            const tB = stats[m.teamB.id];

            if (!tA || !tB) return;

            tA.played++; tB.played++;
            tA.setsWon += m.teamA.sets; tA.setsLost += m.teamB.sets;
            tB.setsWon += m.teamB.sets; tB.setsLost += m.teamA.sets;

            (m.setHistory || []).forEach(h => {
                tA.pointsWon += parseInt(h.scoreA || 0); tA.pointsLost += parseInt(h.scoreB || 0);
                tB.pointsWon += parseInt(h.scoreB || 0); tB.pointsLost += parseInt(h.scoreA || 0);
            });

            if (m.teamA.sets > m.teamB.sets) {
                tA.won++; tB.lost++;
                if (m.teamB.sets === 2) { tA.points += 2; tB.points += 1; }
                else { tA.points += 3; tB.points += 0; }
            } else {
                tB.won++; tA.lost++;
                if (m.teamA.sets === 2) { tB.points += 2; tA.points += 1; }
                else { tB.points += 3; tA.points += 0; }
            }
        });

        return Object.values(stats).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.won !== a.won) return b.won - a.won;
            const setRatioA = a.setsLost === 0 ? 100 : a.setsWon / a.setsLost;
            const setRatioB = b.setsLost === 0 ? 100 : b.setsWon / b.setsLost;
            return setRatioB - setRatioA;
        });
    };

    const standings = calculateStandings();

    // Group Matches
    const todayStr = new Date().toISOString().split('T')[0];

    // UPDATED: Explicitly look for 'Live' status
    const liveMatch = matchList.find(m => m.status === 'Live');

    // UPDATED: Next match is the first Scheduled one, regardless of whether a Live match exists
    const nextMatch = matchList
        .filter(m => m.status === 'Scheduled')
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))[0];

    // UPDATED: Logic to decide what to show in Hero vs List
    const heroMatch = liveMatch || nextMatch;

    // Filter out the hero match from the upcoming list so it doesn't show twice
    const todaysMatches = matchList.filter(m => m.date === todayStr && m.id !== heroMatch?.id && m.status === 'Scheduled').sort((a, b) => a.time.localeCompare(b.time));
    const upcomingMatches = matchList.filter(m => m.date > todayStr && m.status !== 'Finished' && m.id !== heroMatch?.id);
    const pastMatches = matchList.filter(m => m.status === 'Finished').sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));

    const getSetScores = (m) => {
        if (!m.setHistory) return "";
        return m.setHistory.map(h => `${h.scoreA}-${h.scoreB}`).join(', ');
    }

    const allUpcoming = [...todaysMatches, ...upcomingMatches];

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col overflow-x-hidden">
            {/* Header */}
            <div className="w-full bg-[#2F36CF] p-4 shadow-lg flex items-center justify-between sticky top-0 z-50 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <img src="/img/cava_logo.png" className="h-10 object-contain p-1 bg-white/10 rounded" />
                    <div>
                        <h1 className="text-xl font-black uppercase italic leading-none">WOMEN'S CAVA CUP 2025</h1>
                    </div>
                </div>
                {liveMatch && (
                    <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span className="font-black text-[10px] uppercase tracking-wider">Live</span>
                    </div>
                )}
            </div>

            {/* Main Content Area - Full Width for 1920x1080 */}
            <div className="w-full h-full flex-1 p-4 md:p-6 lg:px-12 xl:px-16 space-y-6 flex flex-col">

                {/* --- HERO SECTION: LIVE OR NEXT MATCH --- */}
                {heroMatch && (
                    <div className="w-full animate-in slide-in-from-top-4 duration-700 space-y-4 shrink-0">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-800">
                            {/* Background decoration */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-purple-900/40 z-0"></div>
                            <div className="absolute top-0 right-0 p-32 bg-[#2F36CF] blur-[120px] opacity-20 rounded-full"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 xl:p-10 gap-6">
                                {/* Left Team */}
                                <div className="flex-1 flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 md:w-32 md:h-32 xl:w-40 xl:h-40 rounded-full bg-slate-900 border-4 border-white/10 shadow-xl overflow-hidden relative">
                                        {heroMatch.teamA.flag ? <img src={heroMatch.teamA.flag} className="w-full h-full object-cover" /> : <Flag className="w-10 h-10 text-slate-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-3xl md:text-5xl xl:text-6xl font-black uppercase tracking-tight leading-none mb-1">{heroMatch.teamA.country}</h2>
                                        <div className="text-sm font-bold text-slate-400">{heroMatch.teamA.name}</div>
                                    </div>
                                </div>

                                {/* Center Info */}
                                <div className="flex flex-col items-center justify-center w-full md:w-auto">
                                    {heroMatch.status === 'Live' ? (
                                        <>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="bg-red-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full animate-pulse">Live</div>
                                                <div className="bg-white/10 text-white text-xs font-black uppercase px-3 py-1 rounded-full">Set {heroMatch.setHistory?.length + 1 || 1}</div>
                                            </div>
                                            <div className="flex items-center gap-6 md:gap-8">
                                                <span className="text-7xl md:text-9xl xl:text-[10rem] font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tabular-nums tracking-tighter">
                                                    {heroMatch.teamA.score}
                                                </span>
                                                <span className="text-2xl font-bold text-slate-500 uppercase">-</span>
                                                <span className="text-7xl md:text-9xl xl:text-[10rem] font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tabular-nums tracking-tighter">
                                                    {heroMatch.teamB.score}
                                                </span>
                                            </div>
                                            <div className="mt-4 bg-black/40 px-8 py-3 rounded-2xl text-2xl font-black text-yellow-400 border border-yellow-500/30 tracking-widest shadow-lg">
                                                SETS: {heroMatch.teamA.sets} - {heroMatch.teamB.sets}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-[#2F36CF] text-white text-xs font-black uppercase px-3 py-1 rounded-full mb-4">Next Match</div>
                                            <div className="text-5xl md:text-7xl xl:text-8xl font-black text-slate-700 tracking-widest">VS</div>
                                            <div className="mt-4 flex flex-col items-center">
                                                <div className="text-2xl font-bold text-white mb-1">{heroMatch.time}</div>
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{heroMatch.date}</div>
                                                <div className="text-[10px] mt-2 bg-white/5 px-2 py-1 rounded text-slate-500">{heroMatch.leagueName}</div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Right Team */}
                                <div className="flex-1 flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 md:w-32 md:h-32 xl:w-40 xl:h-40 rounded-full bg-slate-900 border-4 border-white/10 shadow-xl overflow-hidden relative">
                                        {heroMatch.teamB.flag ? <img src={heroMatch.teamB.flag} className="w-full h-full object-cover" /> : <Flag className="w-10 h-10 text-slate-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-3xl md:text-5xl xl:text-6xl font-black uppercase tracking-tight leading-none mb-1">{heroMatch.teamB.country}</h2>
                                        <div className="text-sm font-bold text-slate-400">{heroMatch.teamB.name}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- UP NEXT BANNER --- */}
                        {liveMatch && nextMatch && (
                            <div className="w-full bg-slate-800/80 rounded-xl border border-white/5 p-4 flex items-center justify-between shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase px-2 py-1 rounded border border-blue-600/30">Up Next</div>
                                    <div className="text-sm font-bold text-slate-300">{nextMatch.time}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-white">{nextMatch.teamA.name}</span>
                                    <span className="text-[10px] font-bold text-slate-500">VS</span>
                                    <span className="font-bold text-white">{nextMatch.teamB.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase hidden md:block">{nextMatch.leagueName}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- MAIN CONTENT GRID --- */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">

                    {/* LEFT COLUMN: MATCH LISTS (Span 8 on large screens) */}
                    <div className="xl:col-span-8 space-y-6 flex flex-col">

                        {/* Results Section */}
                        {pastMatches.length > 0 && (
                            <div className="animate-in slide-in-from-left-4 duration-700 delay-100 flex flex-col">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                    <h3 className="flex items-center gap-2 font-black text-lg uppercase tracking-wider text-slate-300">
                                        <CheckCircle size={20} className="text-green-500" /> Latest Results
                                    </h3>
                                    {pastMatches.length > 2 && (
                                        <button onClick={() => setShowAllResults(!showAllResults)} className="text-xs font-bold text-blue-400 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
                                            {showAllResults ? 'Show Less' : 'View All Results'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {(showAllResults ? pastMatches : pastMatches.slice(0, 2)).map(m => (
                                        <div key={m.id} className="bg-slate-800 rounded-xl overflow-hidden border border-white/5 shadow-sm hover:border-white/20 transition-all">
                                            <div className="bg-black/20 px-4 py-2 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>{m.date}</span>
                                                <span>{m.leagueName}</span>
                                            </div>
                                            <div className="p-4 flex items-center justify-between relative">
                                                <div className="flex-1 flex items-center gap-3">
                                                    <div className={`text-xl md:text-2xl font-black uppercase ${m.teamA.sets > m.teamB.sets ? 'text-white' : 'text-slate-500'}`}>{m.teamA.country}</div>
                                                    {m.teamA.flag && <img src={m.teamA.flag} className="w-6 h-4 object-cover rounded shadow-sm opacity-80" />}
                                                </div>
                                                <div className="mx-4 flex flex-col items-center z-10">
                                                    <div className="bg-slate-900 px-4 py-1 rounded-lg border border-white/10 text-2xl font-mono font-bold text-white shadow-inner">
                                                        {m.teamA.sets} - {m.teamB.sets}
                                                    </div>
                                                </div>
                                                <div className="flex-1 flex items-center gap-3 justify-end">
                                                    {m.teamB.flag && <img src={m.teamB.flag} className="w-6 h-4 object-cover rounded shadow-sm opacity-80" />}
                                                    <div className={`text-xl md:text-2xl font-black uppercase ${m.teamB.sets > m.teamA.sets ? 'text-white' : 'text-slate-500'}`}>{m.teamB.country}</div>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-3 pt-0 text-center">
                                                <span className="text-xs font-mono font-bold text-slate-500 tracking-widest">{getSetScores(m)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Today & Upcoming */}
                        {allUpcoming.length > 0 && (
                            <div className="animate-in slide-in-from-left-4 duration-700 delay-200 flex flex-col flex-1">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                    <h3 className="flex items-center gap-2 font-black text-lg uppercase tracking-wider text-slate-300">
                                        <Calendar size={20} className="text-blue-500" /> Schedule
                                    </h3>
                                    {allUpcoming.length > 3 && (
                                        <button onClick={() => setShowAllSchedule(!showAllSchedule)} className="text-xs font-bold text-blue-400 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1">
                                            {showAllSchedule ? 'Show Less' : 'View All Matches'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {(showAllSchedule ? allUpcoming : allUpcoming.slice(0, 3)).map(m => (
                                        <div key={m.id} className="group bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-white/5 hover:bg-slate-800 hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center w-16 bg-white/5 rounded p-2">
                                                    <span className="text-lg font-bold text-white leading-none">{m.time}</span>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Time</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-blue-400 mb-1">{m.date === todayStr ? 'TODAY' : m.date}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-200">{m.teamA.name}</span>
                                                        <span className="text-[10px] text-slate-600 bg-black/40 px-1 rounded">VS</span>
                                                        <span className="font-bold text-slate-200">{m.teamB.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden md:block text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-black/20 px-2 py-1 rounded">
                                                {m.leagueName}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: STANDINGS (Span 4 on large screens) */}
                    <div className="xl:col-span-4 h-full">
                        <div className="sticky top-24 animate-in slide-in-from-right-4 duration-700 delay-300">
                            <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-white/10">
                                <div className="bg-[#2F36CF] p-4 flex justify-between items-center">
                                    <h3 className="font-black text-lg uppercase italic text-white flex items-center gap-2"><Trophy size={18} /> Standings</h3>
                                    <div className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded text-white/80">LIVE TABLE</div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/20 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                <th className="p-3">Team</th>
                                                <th className="p-3 text-center">P</th>
                                                <th className="p-3 text-center">W</th>
                                                <th className="p-3 text-center">L</th>
                                                <th className="p-3 text-center text-white bg-blue-600/20">PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {standings.map((t, i) => (
                                                <tr key={t.id} className={`hover:bg-white/5 transition-colors ${i < 4 ? 'bg-white/[0.02]' : ''}`}>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-slate-500 text-xs w-3">{i + 1}</span>
                                                            {t.flag && <img src={t.flag} className="w-5 h-3 object-cover rounded shadow-sm" />}
                                                            <span className="font-bold text-sm text-slate-200 truncate max-w-[100px]">{t.country}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center text-xs font-bold text-slate-400">{t.played}</td>
                                                    <td className="p-3 text-center text-xs font-bold text-green-400">{t.won}</td>
                                                    <td className="p-3 text-center text-xs font-bold text-red-400">{t.lost}</td>
                                                    <td className="p-3 text-center font-black text-sm text-white bg-blue-600/10 border-l border-white/5">{t.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Legend */}
                                <div className="p-3 bg-black/30 text-[9px] text-slate-500 font-bold text-center border-t border-white/5">
                                    3 PTS (3-0/3-1) • 2 PTS (3-2) • 1 PT (2-3)
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Footer */}
            <div className="w-full text-center p-6 text-slate-600 text-xs mt-auto border-t border-white/5 bg-black/20 shrink-0">
                Live Scoring & Results System
            </div>
        </div>
    )
}

// --- Referee Manager ---
function RefereeManager({ onBack }) {
    const { referees, setReferees } = useVolleyballData();
    const [newRef, setNewRef] = useState({ name: '', country: '' });

    const safeReferees = Array.isArray(referees) ? referees : [];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-6 flex justify-between items-center"><button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full"><ChevronLeft /></button><h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck /> Referee Manager</h1></header>
            <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 flex gap-4 items-end">
                <div className="flex-1"><label className="text-xs font-bold text-slate-500">Name</label><input value={newRef.name} onChange={e => setNewRef({ ...newRef, name: e.target.value })} className="w-full border p-2 rounded" /></div>
                <div className="w-1/3"><label className="text-xs font-bold text-slate-500">Country</label><input value={newRef.country} onChange={e => setNewRef({ ...newRef, country: e.target.value })} className="w-full border p-2 rounded" /></div>
                <button onClick={() => { if (newRef.name) { setReferees([...safeReferees, { id: Date.now().toString(), ...newRef }]); setNewRef({ name: '', country: '' }); } }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Add</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Country</th><th className="p-3 text-right">Action</th></tr></thead>
                    <tbody>{safeReferees.map(r => <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-bold">{r.name}</td><td className="p-3">{r.country}</td><td className="p-3 text-right"><button onClick={() => setReferees(safeReferees.filter(x => x.id !== r.id))} className="text-red-500"><Trash2 size={16} /></button></td></tr>)}</tbody>
                </table>
            </div>
        </div>
    )
}

// --- NEW: Chunked Upload Helper (Prevents Browser Crash) ---
// --- FIXED: Chunked Upload Helper ---
const uploadChunkedFile = (file, onProgress) => {
    return new Promise((resolve, reject) => {
        const serverUrl = window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';

        if (!window.io) {
            reject("Socket.io not loaded yet");
            return;
        }

        const socket = window.io(serverUrl);
        const CHUNK_SIZE = 1024 * 1024; // 1MB
        let offset = 0;

        socket.on('connect', () => {
            // Start uploading first chunk
            readAndSendChunk();
        });

        socket.on('chunk_received', (data) => {
            // Update offset from server response
            offset = data.offset;
            const progress = Math.round((offset / file.size) * 100);
            if (onProgress) onProgress(progress);

            if (offset < file.size) {
                // Send next chunk
                readAndSendChunk();
            } else {
                // All chunks sent, tell server to finalize
                socket.emit('upload_complete', { key: 'temp', fileName: file.name });
            }
        });

        // --- THE FIX IS HERE: Wait for Server Confirmation ---
        socket.on('upload_success', ({ url }) => {
            socket.disconnect();
            resolve(url); // This unlocks the button and returns the video URL
        });

        socket.on('upload_error', (err) => {
            socket.disconnect();
            reject(err.message);
        });

        const readAndSendChunk = () => {
            const reader = new FileReader();
            const slice = file.slice(offset, offset + CHUNK_SIZE);

            reader.onload = (e) => {
                socket.emit('upload_chunk', {
                    fileName: file.name,
                    data: e.target.result,
                    offset: offset
                });
            };

            reader.readAsArrayBuffer(slice);
        };
    });
};

// --- Team Manager ---
// --- Team Manager (Updated with Chunk Upload) ---
function TeamManager({ onBack }) {
    const { teams, setTeams } = useVolleyballData();
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamCountry, setNewTeamCountry] = useState('');
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [playerForm, setPlayerForm] = useState({ name: '', number: '', position: '', photo: '' });

    // NEW: Upload State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const teamList = Array.isArray(teams) ? teams : [];
    const activeTeam = teamList.find(t => t.id === editingTeamId);
    const updateTeam = (id, f, v) => setTeams(teamList.map(t => t.id === id ? { ...t, [f]: v } : t));

    // Handler for Video Uploads
    const handleVideoUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const fileUrl = await uploadChunkedFile(file, (progress) => {
                setUploadProgress(progress);
            });
            // Update the form with the server URL (e.g. /uploads/video.webm)
            setPlayerForm(prev => ({ ...prev, photo: fileUrl }));
            alert("Video Upload Complete!");
        } catch (error) {
            console.error(error);
            alert("Upload Failed");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 h-screen flex flex-col">
            <header className="mb-6 flex gap-4 items-center"><button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full"><ChevronLeft /></button><h1 className="text-2xl font-bold flex gap-2"><Users /> Team Manager</h1></header>
            <div className="flex flex-1 gap-6 overflow-hidden">
                <div className="w-1/3 flex flex-col gap-4 bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex gap-2"><input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="New Team Name" className="flex-1 border p-2 rounded" /><button onClick={() => { if (newTeamName) { setTeams([...teamList, { id: Date.now().toString(), name: newTeamName, country: newTeamCountry, logo: '', flag: '', roster: [] }]); setNewTeamName(''); } }} className="bg-blue-600 text-white p-2 rounded"><Plus /></button></div>
                    <div className="flex-1 overflow-y-auto space-y-2">{teamList.map(t => <div key={t.id} onClick={() => setEditingTeamId(t.id)} className={`p-3 rounded border cursor-pointer flex justify-between items-center ${editingTeamId === t.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-slate-50'}`}><span className="font-bold">{t.name}</span><button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) setTeams(teamList.filter(x => x.id !== t.id)); }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></div>)}</div>
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 overflow-y-auto">
                    {activeTeam ? (
                        <div className="space-y-6">
                            <div className="flex gap-6 border-b pb-6">
                                <div className="w-32 h-32 bg-slate-100 rounded flex items-center justify-center relative border-2 border-dashed">{activeTeam.logo ? <img src={activeTeam.logo} className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Logo</span>}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => processFile(e.target.files[0], u => updateTeam(activeTeam.id, 'logo', u))} /></div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold">Name (Full)</label><input value={activeTeam.name} onChange={e => updateTeam(activeTeam.id, 'name', e.target.value)} className="w-full border p-2 rounded font-bold" placeholder="e.g. MALDIVES" /></div><div><label className="text-xs font-bold">Country/Short Code</label><input value={activeTeam.country} onChange={e => updateTeam(activeTeam.id, 'country', e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. MDV" /></div></div>
                                    <div><label className="text-xs font-bold">Flag</label><div className="flex items-center gap-2">{activeTeam.flag && <img src={activeTeam.flag} className="h-6" />}<input type="file" className="text-xs" onChange={e => processFile(e.target.files[0], u => updateTeam(activeTeam.id, 'flag', u), 100)} /></div></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-4"><h3 className="font-bold flex gap-2"><LayoutGrid size={20} /> Roster</h3><button onClick={() => { setIsAddingPlayer(true); setEditingPlayerId(null); setPlayerForm({ name: '', number: '', position: '', photo: '' }); }} className="bg-slate-800 text-white px-3 py-1 rounded text-sm flex gap-2"><UserPlus size={16} /> Add</button></div>

                                {isAddingPlayer && <div className="bg-slate-50 p-4 rounded border mb-4 grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-2"><label className="text-xs">No.</label><input value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value })} className="w-full border p-1 rounded" /></div>
                                    <div className="col-span-4"><label className="text-xs">Name</label><input value={playerForm.name} onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })} className="w-full border p-1 rounded" /></div>
                                    <div className="col-span-3">
                                        <label className="text-xs">Pos</label>
                                        <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full border p-1 rounded">
                                            <option value="">Select...</option>
                                            <option value="Setter">Setter (S, ST)</option>
                                            <option value="Outside Hitter">Outside Hitter (OH)</option>
                                            <option value="Opposite Hitter">Opposite Hitter (OP)</option>
                                            <option value="Middle Blocker">Middle Blocker (MB)</option>
                                            <option value="Libero">Libero (L, LB)</option>
                                            <option value="Wing Spiker">Wing Spiker (WS)</option>
                                            <option value="Middle Defender">Middle Defender (MD)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-12 grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                                        {/* Image Upload (Existing) */}
                                        <div>
                                            <label className="text-xs font-bold block mb-1 flex items-center gap-1"><ImageIcon size={12} /> Image (Auto-Compress)</label>
                                            <input type="file" accept="image/*" className="text-[10px] w-full" onChange={e => processFile(e.target.files[0], u => setPlayerForm({ ...playerForm, photo: u }))} />
                                        </div>

                                        {/* NEW: Chunked Video Upload */}
                                        <div>
                                            <label className="text-xs font-bold block mb-1 flex items-center gap-1 text-purple-600"><VideoIcon size={12} /> Video Upload (WebM/Mov)</label>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                className="text-[10px] w-full"
                                                disabled={isUploading}
                                                onChange={e => handleVideoUpload(e.target.files[0])}
                                            />
                                            {isUploading && (
                                                <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                                                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="text-xs font-bold block mb-1 text-slate-400">File Path (Result)</label>
                                            <input placeholder="/uploads/video.webm" value={playerForm.photo} onChange={e => setPlayerForm({ ...playerForm, photo: e.target.value })} className="w-full border p-1 rounded text-xs" />
                                        </div>
                                    </div>
                                    <button disabled={isUploading} onClick={() => {
                                        let newRoster = [...(activeTeam.roster || [])];
                                        if (editingPlayerId) {
                                            newRoster = newRoster.map(p => p.id === editingPlayerId ? { ...p, ...playerForm } : p);
                                        } else {
                                            newRoster.push({ ...playerForm, id: Date.now().toString() });
                                        }
                                        updateTeam(activeTeam.id, 'roster', newRoster);
                                        setPlayerForm({ name: '', number: '', position: '', photo: '' });
                                        setIsAddingPlayer(false);
                                        setEditingPlayerId(null);
                                    }} className="col-span-12 bg-blue-600 text-white p-2 rounded mt-2 font-bold disabled:bg-slate-400">
                                        {isUploading ? 'Uploading...' : (editingPlayerId ? 'Update Player' : 'Save Player')}
                                    </button>
                                    <button onClick={() => { setIsAddingPlayer(false); setEditingPlayerId(null); }} className="col-span-12 bg-slate-200 text-slate-600 p-2 rounded mt-2 font-bold text-xs">Cancel</button>
                                </div>}
                                <div className="grid grid-cols-3 gap-2">{(activeTeam.roster || []).map(p => <div key={p.id} className="border p-2 rounded flex items-center gap-2 relative group"><div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">{p.photo ? (p.photo.match(/\.(mov|mp4|webm)$/i) || p.photo.startsWith('data:video') || p.photo.includes('/uploads/') ? <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-white">VID</div> : <img src={p.photo} className="w-full h-full object-cover" />) : null}</div><div><div className="font-bold text-sm">#{p.number} {p.name}</div><div className="text-xs text-slate-500">{p.position}</div></div>
                                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                        <button onClick={() => { setPlayerForm(p); setEditingPlayerId(p.id); setIsAddingPlayer(true); }} className="bg-white text-blue-500 rounded shadow-sm p-1 hover:bg-blue-50 border"><Edit size={12} /></button>
                                        <button onClick={() => updateTeam(activeTeam.id, 'roster', activeTeam.roster.filter(x => x.id !== p.id))} className="bg-white text-red-500 rounded shadow-sm p-1 hover:bg-red-50 border"><X size={12} /></button>
                                    </div>
                                </div>)}</div>
                            </div>
                        </div>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">Select a team</div>}
                </div>
            </div>
        </div>
    );
}

// --- Dashboard ---
function Dashboard({ onControl, onOutput, onStadium, onManageTeams, onManageReferees }) {
    // UPDATED: Destructure setTeams and setReferees to allow factory reset
    const { matches, setMatches, teams, setTeams, referees, setReferees, status } = useVolleyballData();

    const [isCreating, setIsCreating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [tab, setTab] = useState('upcoming');
    const [form, setForm] = useState({ date: '', time: '', league: "WOMEN'S CAVA CUP", teamA: '', teamB: '' });

    // Local Settings
    const [serverIp, setServerIp] = useState(() => window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001');

    const updateServerIp = (val) => {
        setServerIp(val);
        window.localStorage.setItem('volleyball_server_url', val);
        if (confirm("Reload to apply server setting?")) window.location.reload();
    };

    const matchList = Array.isArray(matches) ? matches : [];
    const teamList = Array.isArray(teams) ? teams : [];

    const createMatch = (e) => {
        e.preventDefault();
        const tA = teamList.find(t => t.id === form.teamA);
        const tB = teamList.find(t => t.id === form.teamB);

        if (!tA || !tB) {
            alert("Unable to create match: Please make sure you have selected both HOME and AWAY teams.");
            return;
        }

        const newMatch = {
            // UPDATED: Use more unique ID to prevent collisions
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            leagueName: form.league,
            tournamentLogo: '',
            date: form.date,
            time: form.time,
            status: 'Scheduled',
            teamA: { ...tA, score: 0, sets: 0, color: '#1e3a8a', timeouts: 0, activeTimeout: false },
            teamB: { ...tB, score: 0, sets: 0, color: '#be123c', timeouts: 0, activeTimeout: false },
            referee1: { name: '', country: '' },
            referee2: { name: '', country: '' },
            activeReferee: 1,
            serving: 'A',
            serveVisible: false,
            activeText: '',
            activePlayerId: null,
            activeView: 'scoreboard',
            graphicsVisible: false,
            setsVisible: true,
            setHistory: [],
            // UPDATED: Initialize lineups to prevent "uncontrolled input" errors
            lineupA: [],
            lineupB: [],
            lineupStep: 0,
            isSwapped: false,
            ledSponsors: [],
            showLedSponsors: false,
            broadcastSponsors: [],
            showBroadcastSponsors: false
        };

        // UPDATED: Robust sorting to prevent invalid date errors
        const updatedList = [...matchList, newMatch].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return dateA - dateB;
        });

        setMatches(updatedList);
        setIsCreating(false);
    };

    const clearSchedule = () => {
        if (confirm("Are you sure you want to DELETE ALL MATCHES? This will clear the schedule and results. This action cannot be undone.")) {
            setMatches([]);
            alert("Schedule cleared successfully.");
            setShowSettings(false);
        }
    }

    // NEW: Force Push function
    const forcePush = () => {
        if (confirm("FORCE PUSH: This will overwrite the Server's data with your current Local data. Use this if the server data is ghosting or out of sync.")) {
            // Re-setting the current matches will trigger the emit in useSyncedState
            setMatches([...matchList]);
            alert("Force push initiated. Server should now match your view.");
            setShowSettings(false);
        }
    }

    // UPDATED: Factory Reset now clears Server Data, not just local storage
    const factoryReset = () => {
        if (confirm("FACTORY RESET WARNING: This will delete ALL Teams, Matches, Referees, and Settings from the SERVER DATABASE. The app will return to its initial state. Are you sure?")) {
            // 1. Wipe Data on Server
            setMatches([]);
            setTeams([]);
            setReferees([]);

            // 2. Clear Local Preferences
            window.localStorage.removeItem('volleyball_matches');
            window.localStorage.removeItem('volleyball_teams');
            window.localStorage.removeItem('volleyball_referees');

            // 3. Reload
            setTimeout(() => {
                alert("System Reset Complete.");
                window.location.href = window.location.pathname;
            }, 500);
        }
    }

    const copyLink = (matchId, type) => {
        const baseUrl = window.location.origin + window.location.pathname;
        let url = "";

        if (type === 'public') {
            url = `${baseUrl}?view=public&server=${encodeURIComponent(serverIp)}`;
        } else {
            url = `${baseUrl}?view=${type}&matchId=${matchId}&server=${encodeURIComponent(serverIp)}`;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).catch(err => console.error(err));
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
        alert(`${type === 'output' ? 'Broadcast' : type === 'stadium' ? 'LED' : 'Public Page'} Link Copied!`);
    };

    const filtered = matchList.filter(m => tab === 'upcoming' ? m.status !== 'Finished' : m.status === 'Finished');

    return (
        <div className="max-w-6xl mx-auto p-6 relative">

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute top-16 right-6 z-50 bg-white shadow-2xl rounded-xl border p-4 w-72 animate-in slide-in-from-top-2 fade-in">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Settings size={16} /> Settings</h3>
                        <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                    <div className="space-y-3">
                        <button onClick={forcePush} className="w-full text-left p-3 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-2 border border-blue-200">
                            <Upload size={14} /> FORCE PUSH TO SERVER
                        </button>
                        <button onClick={clearSchedule} className="w-full text-left p-3 rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs flex items-center gap-2 border border-red-200">
                            <Trash2 size={14} /> CLEAR SCHEDULE ONLY
                        </button>
                        <button onClick={factoryReset} className="w-full text-left p-3 rounded bg-red-600 text-white hover:bg-red-700 font-bold text-xs flex items-center gap-2 shadow-sm">
                            <AlertTriangle size={14} /> FACTORY RESET (ALL DATA)
                        </button>
                        <div className="text-[10px] text-slate-400 text-center pt-2">
                            Use this to fix "ghost" matches or stuck data.
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div><h1 className="text-3xl font-bold flex gap-2"><Activity className="text-[#2F36CF]" /> Volleyball Broadcast GFX System</h1><p className="text-slate-500">Sun Siyam Media</p></div>

                    <div className="flex items-center gap-4">
                        {/* Server Config */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                            <ServerIcon size={16} className={status === 'connected' ? 'text-green-500' : 'text-red-500'} />
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-400">SERVER URL</label>
                                <input className="text-xs font-mono border-none p-0 focus:ring-0" value={serverIp} onChange={e => setServerIp(e.target.value)} onBlur={(e) => updateServerIp(e.target.value)} />
                            </div>
                            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>

                        {/* Settings Toggle */}
                        <button onClick={() => setShowSettings(!showSettings)} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onManageReferees} className="bg-white border px-4 py-2 rounded font-bold flex gap-2"><UserCheck size={16} /> Refs</button>
                    <button onClick={onManageTeams} className="bg-white border px-4 py-2 rounded font-bold flex gap-2"><Users size={16} /> Teams</button>
                    <button onClick={() => setIsCreating(!isCreating)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex gap-2"><Plus size={16} /> New Match</button>
                    <button onClick={() => copyLink(null, 'public')} className="bg-green-600 text-white px-4 py-2 rounded font-bold flex gap-2 ml-auto"><Share2 size={16} /> Public Link</button>
                </div>
            </header>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-lg border mb-8 animate-in slide-in-from-top-4">
                    <h2 className="text-xl font-bold mb-4">New Fixture</h2>
                    <form onSubmit={createMatch} className="space-y-4">
                        {/* UPDATED GRID: Removed Logo column */}
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-xs font-bold">Date</label><input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <div><label className="text-xs font-bold">Time (24h)</label><input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <div><label className="text-xs font-bold">League</label><input value={form.league} onChange={e => setForm({ ...form, league: e.target.value })} className="w-full border p-2 rounded" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-4 rounded border border-blue-100"><label className="font-bold text-blue-900">Home Team</label><select required value={form.teamA} onChange={e => setForm({ ...form, teamA: e.target.value })} className="w-full p-2 border rounded mt-1"><option value="">Select...</option>{teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            <div className="bg-red-50 p-4 rounded border border-red-100"><label className="font-bold text-red-900">Away Team</label><select required value={form.teamB} onChange={e => setForm({ ...form, teamB: e.target.value })} className="w-full p-2 border rounded mt-1"><option value="">Select...</option>{teamList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        </div>
                        <button className="w-full bg-slate-800 text-white py-3 rounded font-bold">Create Schedule</button>
                    </form>
                </div>
            )}

            <div className="flex gap-6 border-b mb-6"><button onClick={() => setTab('upcoming')} className={`pb-3 font-bold ${tab === 'upcoming' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Upcoming</button><button onClick={() => setTab('history')} className={`pb-3 font-bold ${tab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>History</button></div>

            <div className="space-y-4">
                {filtered.map(m => (
                    <div key={m.id} className="bg-white p-5 rounded-xl border flex justify-between items-center shadow-sm hover:shadow-md transition">
                        <div>
                            <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase mb-2"><span>{m.date}</span><span>{m.time}</span><span className="text-blue-500">{m.status}</span></div>
                            <div className="flex items-center gap-6"><span className="text-xl font-bold">{m.teamA.name}</span><span className="text-slate-300 font-black">VS</span><span className="text-xl font-bold">{m.teamB.name}</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1 mr-2">
                                <button onClick={() => copyLink(m.id, 'output')} className="text-[10px] flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100"><Copy size={10} /> Broadcast</button>
                                <button onClick={() => copyLink(m.id, 'stadium')} className="text-[10px] flex items-center gap-1 text-[#2F36CF] hover:bg-[#2F36CF]/10 px-2 py-1 rounded border border-[#2F36CF]/20"><Copy size={10} /> LED</button>
                            </div>
                            <button onClick={() => onControl(m.id)} className="px-4 py-2 bg-slate-800 text-white rounded font-bold flex gap-2"><Monitor size={16} /> Control</button>
                            <button onClick={() => onOutput(m.id)} className="px-4 py-2 bg-green-600 text-white rounded font-bold flex gap-2"><Tv size={16} /> Output</button>
                            <button onClick={() => onStadium(m.id)} className="px-4 py-2 bg-[#2F36CF] text-white rounded font-bold flex gap-2"><Maximize2 size={16} /> LED</button>
                            <button onClick={() => { if (confirm('Delete?')) setMatches(matchList.filter(x => x.id !== m.id)) }} className="px-3 py-2 bg-red-50 text-red-500 rounded"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// --- Control Panel ---
function ControlPanel({ matchId, onBack }) {
    const { matches, setMatches, teams, referees, status } = useVolleyballData();
    const [tab, setTab] = useState('score');

    // Link Generation Logic
    const serverUrl = window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
    const baseUrl = window.location.origin + window.location.pathname;
    const broadcastLink = `${baseUrl}?view=output&matchId=${matchId}&server=${encodeURIComponent(serverUrl)}`;
    const ledLink = `${baseUrl}?view=stadium&matchId=${matchId}&server=${encodeURIComponent(serverUrl)}`;

    const copyToClipboard = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(err => console.error(err));
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try { document.execCommand('copy'); } catch (err) { console.error(err); }
            document.body.removeChild(textArea);
        }
        alert("Link copied!");
    };

    const matchList = Array.isArray(matches) ? matches : [];
    const idx = matchList.findIndex(m => m.id === matchId);
    const match = matchList[idx];

    const updateMatch = (data) => {
        const copy = [...matchList];
        copy[idx] = { ...copy[idx], ...data };
        setMatches(copy);
    };

    // --- NEW: Toggle Match Status (Scheduled -> Live -> Finished) ---
    const cycleStatus = () => {
        const statuses = ['Scheduled', 'Live', 'Finished'];
        const currentIdx = statuses.indexOf(match.status || 'Scheduled');
        const nextIdx = (currentIdx + 1) % statuses.length;
        const newStatus = statuses[nextIdx];

        if (newStatus === 'Finished' && !confirm("Are you sure you want to FINISH this match? It will move to History.")) return;

        updateMatch({ status: newStatus });
    };

    // --- NEW: Timeout Auto-Off Logic ---
    useEffect(() => {
        if (!match) return;

        const checkTimeouts = () => {
            const now = Date.now();
            let updates = {};
            let hasUpdates = false;

            // Check Team A
            if (match.teamA?.activeTimeout && match.teamA?.timeoutExpires && now > match.teamA.timeoutExpires) {
                updates.teamA = { ...match.teamA, activeTimeout: false, timeoutExpires: null };
                hasUpdates = true;
            }

            // Check Team B
            if (match.teamB?.activeTimeout && match.teamB?.timeoutExpires && now > match.teamB.timeoutExpires) {
                updates.teamB = { ...match.teamB, ...updates.teamB, activeTimeout: false, timeoutExpires: null };
                // Note: if teamA also updated, we need to merge carefully, but usually only one timeout happens at a time.
                // If both expire exactly same second, we might lose one update if not careful.
                // Safer merge:
                if (updates.teamA) {
                    updates.teamB = { ...match.teamB, activeTimeout: false, timeoutExpires: null };
                } else {
                    updates.teamB = { ...match.teamB, activeTimeout: false, timeoutExpires: null };
                }
                hasUpdates = true;
            }

            if (hasUpdates) {
                updateMatch(updates);
            }
        };

        const interval = setInterval(checkTimeouts, 1000);
        return () => clearInterval(interval);
    }, [match]); // Dependent on match state to check expiry

    const getLatestTeamData = (matchTeam) => {
        if (!matchTeam) return null;
        const latest = (teams || []).find(t => t.id === matchTeam.id);
        if (!latest) return matchTeam;
        return { ...matchTeam, name: latest.name, country: latest.country, logo: latest.logo, flag: latest.flag, roster: latest.roster };
    };

    if (!match) return <div>Loading...</div>;

    const currentTeamA = getLatestTeamData(match.teamA);
    const currentTeamB = getLatestTeamData(match.teamB);
    const left = match.isSwapped ? currentTeamB : currentTeamA;
    const right = match.isSwapped ? currentTeamA : currentTeamB;
    const leftId = match.isSwapped ? 'teamB' : 'teamA';
    const rightId = match.isSwapped ? 'teamA' : 'teamB';
    const refereeList = Array.isArray(referees) ? referees : [];

    const handleScore = (teamField, delta) => {
        const teamData = match[teamField];
        const val = Math.max(0, (teamData.score || 0) + delta);
        const updates = { [teamField]: { ...teamData, score: val } };
        if (delta > 0) updates.serving = teamField === 'teamA' ? 'A' : 'B';
        updateMatch(updates);
    };

    // --- NEW: Handle Timeout (Adds 30s Timer) ---
    const handleTimeout = (teamField, delta) => {
        const teamData = match[teamField];
        const val = Math.max(0, (teamData.timeouts || 0) + delta);

        let updates = { timeouts: val };

        // If adding a timeout, automatically trigger alert for 30 seconds
        if (delta > 0) {
            updates.activeTimeout = true;
            updates.timeoutExpires = Date.now() + 30000;
        }

        updateMatch({ [teamField]: { ...teamData, ...updates } });
    };

    const finishSet = () => {
        if (!confirm("Finish Set?")) return;
        const winner = match.teamA.score > match.teamB.score ? 'teamA' : 'teamB';
        const history = [...(match.setHistory || []), { set: (match.setHistory?.length || 0) + 1, scoreA: match.teamA.score, scoreB: match.teamB.score, winner }];
        updateMatch({
            setHistory: history,
            [winner]: { ...match[winner], sets: match[winner].sets + 1 },
            teamA: { ...match.teamA, score: 0, timeouts: 0, activeTimeout: false },
            teamB: { ...match.teamB, score: 0, timeouts: 0, activeTimeout: false },
            isSwapped: !match.isSwapped
        });
    };

    const toggleView = (viewName) => {
        if (match.activeView === viewName && match.graphicsVisible) {
            updateMatch({ graphicsVisible: false });
        } else {
            updateMatch({ activeView: viewName, graphicsVisible: true });
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full"><ArrowLeftRight /></button><div><h2 className="font-bold">{match.leagueName}</h2><div className="text-xs text-slate-400">{match.teamA.name} vs {match.teamB.name}</div></div></div>
                <div className="flex items-center gap-3">

                    {/* NEW STATUS BUTTON */}
                    <button
                        onClick={cycleStatus}
                        className={`text-xs px-4 py-2 rounded font-black uppercase tracking-wider transition-all ${match.status === 'Live' ? 'bg-red-600 animate-pulse shadow-red-500/50 shadow-lg' :
                            match.status === 'Finished' ? 'bg-slate-600 text-slate-400' :
                                'bg-blue-600'
                            }`}
                    >
                        {match.status || 'SCHEDULED'}
                    </button>

                    <button onClick={() => updateMatch({ serveVisible: !match.serveVisible })} className={`text-xs px-4 py-2 rounded font-bold ${match.serveVisible ? 'bg-yellow-500 text-black' : 'bg-slate-700'}`}>Serve Icon: {match.serveVisible ? 'ON' : 'OFF'}</button>
                    <div className={`text-xs px-2 py-1 rounded flex gap-1 items-center ${status === 'connected' ? 'text-green-400 bg-green-900/30' : 'text-[#2F36CF] bg-indigo-900/30'}`}>{status === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />} {status.toUpperCase()}</div>
                    <button onClick={() => updateMatch({ graphicsVisible: !match.graphicsVisible })} className={`text-xs px-4 py-2 rounded font-bold ${match.graphicsVisible ? 'bg-green-500' : 'bg-red-500'}`}>{match.graphicsVisible ? 'GFX ON' : 'GFX OFF'}</button>
                    <button onClick={() => window.open(broadcastLink, '_blank')} className="text-xs bg-slate-700 px-3 py-2 rounded">Output Window</button>
                </div>
            </div>

            <div className="p-4 flex gap-4">
                <button onClick={() => setTab('score')} className={`px-4 py-2 rounded font-bold ${tab === 'score' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Scoring</button>
                <button onClick={() => setTab('gfx')} className={`px-4 py-2 rounded font-bold ${tab === 'gfx' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Graphics & Links</button>
                <button onClick={() => setTab('subs')} className={`px-4 py-2 rounded font-bold ${tab === 'subs' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Substitution</button> {/* NEW BUTTON */}
                <button onClick={() => setTab('sponsors')} className={`px-4 py-2 rounded font-bold ${tab === 'sponsors' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Sponsors</button>
            </div>

            <div className="flex-1 overflow-hidden flex gap-4 p-4 pt-0">

                {tab === 'score' && (
                    <>
                        {/* Left Side Player List */}
                        <div className="w-64 bg-white rounded-xl border flex flex-col overflow-hidden shadow-sm">
                            <div className="p-3 bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b text-center border-t-4" style={{ borderColor: left.color }}>{left.name}<br /><span className="text-[10px] opacity-70">Active Player Overlay</span></div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {(left.roster || []).map(p => (
                                    <button key={p.id} onClick={() => updateMatch({ activePlayerId: match.activePlayerId === p.id ? null : p.id, activeText: `#${p.number} ${p.name}` })} className={`w-full text-left p-2 rounded flex items-center gap-2 transition-all ${match.activePlayerId === p.id ? 'bg-yellow-100 border border-yellow-400 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
                                        <span className="font-mono font-bold text-slate-500 w-6 bg-white rounded text-center border">{p.number}</span>
                                        <span className="truncate flex-1 text-xs font-bold text-slate-700">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Center Controls */}
                        <div className="flex-1 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <TeamController
                                    name={left.name}
                                    data={match[leftId]}
                                    serving={match.serving === (match.isSwapped ? 'B' : 'A')}
                                    onScore={d => handleScore(leftId, d)}
                                    onSet={d => updateMatch({ [leftId]: { ...match[leftId], sets: Math.max(0, match[leftId].sets + d) } })}
                                    onColor={c => updateMatch({ [leftId]: { ...match[leftId], color: c } })}
                                    onTimeout={d => handleTimeout(leftId, d)}
                                    onServe={() => updateMatch({ serving: leftId === 'teamA' ? 'A' : 'B' })}
                                    onAlert={() => updateMatch({ [leftId]: { ...match[leftId], activeTimeout: !match[leftId].activeTimeout, timeoutExpires: null } })}
                                />
                                <TeamController
                                    name={right.name}
                                    data={match[rightId]}
                                    serving={match.serving === (match.isSwapped ? 'A' : 'B')}
                                    onScore={d => handleScore(rightId, d)}
                                    onSet={d => updateMatch({ [rightId]: { ...match[rightId], sets: Math.max(0, match[rightId].sets + d) } })}
                                    onColor={c => updateMatch({ [rightId]: { ...match[rightId], color: c } })}
                                    onTimeout={d => handleTimeout(rightId, d)}
                                    onServe={() => updateMatch({ serving: rightId === 'teamA' ? 'A' : 'B' })}
                                    onAlert={() => updateMatch({ [rightId]: { ...match[rightId], activeTimeout: !match[rightId].activeTimeout, timeoutExpires: null } })}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={finishSet} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"><CheckCircle /> Finish Set</button>
                                <button onClick={() => updateMatch({ isSwapped: !match.isSwapped })} className="px-8 py-4 bg-amber-100 text-amber-900 rounded-xl font-bold flex gap-2 hover:bg-amber-200 active:scale-95 transition-all"><ArrowLeftRight /> Swap</button>
                            </div>
                        </div>

                        {/* Right Side Player List */}
                        <div className="w-64 bg-white rounded-xl border flex flex-col overflow-hidden shadow-sm">
                            <div className="p-3 bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b text-center border-t-4" style={{ borderColor: right.color }}>{right.name}<br /><span className="text-[10px] opacity-70">Active Player Overlay</span></div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {(right.roster || []).map(p => (
                                    <button key={p.id} onClick={() => updateMatch({ activePlayerId: match.activePlayerId === p.id ? null : p.id, activeText: `#${p.number} ${p.name}` })} className={`w-full text-left p-2 rounded flex items-center gap-2 transition-all ${match.activePlayerId === p.id ? 'bg-yellow-100 border border-yellow-400 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
                                        <span className="font-mono font-bold text-slate-500 w-6 bg-white rounded text-center border">{p.number}</span>
                                        <span className="truncate flex-1 text-xs font-bold text-slate-700">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {tab === 'subs' && (
                    <div className="flex-1 bg-white p-6 rounded-xl border shadow-sm overflow-y-auto">
                        <h3 className="font-bold text-xl flex items-center gap-2 mb-6"><Repeat size={24} /> Substitution Manager</h3>

                        <div className="grid grid-cols-2 gap-8">
                            {/* TEAM A (OR LEFT) */}
                            <SubController
                                team={left}
                                side="left"
                                match={match}
                                updateMatch={updateMatch}
                            />

                            {/* TEAM B (OR RIGHT) */}
                            <SubController
                                team={right}
                                side="right"
                                match={match}
                                updateMatch={updateMatch}
                            />
                        </div>
                    </div>
                )}


                {tab === 'sponsors' && (
                    <div className="flex-1 bg-white p-6 rounded-xl border shadow-sm overflow-hidden flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-xl flex items-center gap-2"><DollarSign size={24} /> Sponsor Logos</h3>
                            <p className="text-sm text-slate-500">Manage logos for Broadcast and LED screens independently.</p>
                        </div>
                        <div className="flex-1 flex gap-8 overflow-hidden">
                            {/* BROADCAST SPONSORS */}
                            <div className="flex-1 flex flex-col bg-slate-50 rounded-xl p-4 border">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="font-bold text-blue-800 flex items-center gap-2"><Tv size={16} /> BROADCAST</div>
                                    <button onClick={() => updateMatch({ showBroadcastSponsors: !match.showBroadcastSponsors })} className={`text-[10px] px-2 py-1 rounded font-bold ${match.showBroadcastSponsors ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{match.showBroadcastSponsors ? 'ON' : 'OFF'}</button>
                                </div>
                                <label className="block w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-colors mb-4">
                                    <Upload size={20} className="text-slate-400 mb-1" /><span className="text-xs text-slate-600 font-bold">Add Broadcast Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { processFile(e.target.files[0], (data) => { updateMatch({ broadcastSponsors: [...(match.broadcastSponsors || []), data] }); }, 400); }} />
                                </label>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {(match.broadcastSponsors || []).map((logo, i) => (
                                        <div key={i} className="relative group border rounded bg-white flex items-center justify-center p-2 h-20 shadow-sm"><img src={logo} className="max-w-full max-h-full object-contain" /><button onClick={() => updateMatch({ broadcastSponsors: match.broadcastSponsors.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>
                                    ))}
                                </div>
                            </div>

                            {/* LED SPONSORS */}
                            <div className="flex-1 flex flex-col bg-slate-50 rounded-xl p-4 border">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="font-bold text-[#2F36CF] flex items-center gap-2"><Maximize2 size={16} /> LED / STADIUM</div>
                                    <button onClick={() => updateMatch({ showLedSponsors: !match.showLedSponsors })} className={`text-[10px] px-2 py-1 rounded font-bold ${match.showLedSponsors ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{match.showLedSponsors ? 'ON' : 'OFF'}</button>
                                </div>

                                {/* NEW: ASPECT RATIO SELECTOR */}
                                <div className="mb-4 bg-white p-2 rounded border shadow-sm">
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">SCREEN ASPECT RATIO</label>
                                    <select value={match.ledAspectRatio || '1:1'} onChange={(e) => updateMatch({ ledAspectRatio: e.target.value })} className="w-full text-sm font-bold border rounded p-1">
                                        <option value="1:1">1:1 Square (Jumbotron)</option>
                                        <option value="16:9">16:9 Widescreen (Standard)</option>
                                    </select>
                                </div>

                                <label className="block w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-colors mb-4">
                                    <Upload size={20} className="text-slate-400 mb-1" /><span className="text-xs text-slate-600 font-bold">Add LED Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => { processFile(e.target.files[0], (data) => { updateMatch({ ledSponsors: [...(match.ledSponsors || []), data] }); }, 400); }} />
                                </label>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {(match.ledSponsors || []).map((logo, i) => (
                                        <div key={i} className="relative group border rounded bg-white flex items-center justify-center p-2 h-20 shadow-sm"><img src={logo} className="max-w-full max-h-full object-contain" /><button onClick={() => updateMatch({ ledSponsors: match.ledSponsors.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {tab === 'gfx' && (
                    <div className="flex-1 flex gap-6 overflow-hidden">
                        <div className="w-1/3 space-y-4 overflow-y-auto pr-2 pb-4">
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3 flex items-center gap-2"><LinkIcon size={16} /> vMix / OBS Links</h3>
                                <div className="space-y-2">
                                    <div className="border rounded p-2 bg-slate-50 flex justify-between items-center">
                                        <div className="text-xs font-mono truncate mr-2">Broadcast Overlay</div>
                                        <button onClick={() => copyToClipboard(broadcastLink)} className="text-blue-600 hover:text-blue-800"><Copy size={16} /></button>
                                    </div>
                                    <div className="border rounded p-2 bg-slate-50 flex justify-between items-center">
                                        <div className="text-xs font-mono truncate mr-2">LED / Stadium</div>
                                        <button onClick={() => copyToClipboard(ledLink)} className="text-[#2F36CF] hover:text-indigo-800"><Copy size={16} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3">Main Views</h3>
                                <div className="space-y-2">
                                    <button onClick={() => toggleView('scoreboard')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'scoreboard' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Scoreboard {match.activeView === 'scoreboard' && match.graphicsVisible ? '(ON)' : ''}</button>
                                    <button onClick={() => toggleView('full_time')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'full_time' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Full Time Result {match.activeView === 'full_time' && match.graphicsVisible ? '(ON)' : ''}</button>
                                    <button onClick={() => toggleView('referees')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'referees' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Referees {match.activeView === 'referees' && match.graphicsVisible ? '(ON)' : ''}</button>
                                    <button onClick={() => toggleView('summary')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'summary' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Match Summary {match.activeView === 'summary' && match.graphicsVisible ? '(ON)' : ''}</button>
                                    <button onClick={() => toggleView('standings')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'standings' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Live Standings {match.activeView === 'standings' && match.graphicsVisible ? '(ON)' : ''}</button>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3">Referees</h3>
                                <div className="space-y-3">
                                    <div><label className="text-xs font-bold">R1</label><select className="w-full border p-2 rounded" value={match.referee1?.id || ""} onChange={e => { const r = refereeList.find(x => x.id === e.target.value); updateMatch({ referee1: { name: r?.name || '', country: r?.country || '', id: r?.id } }) }}><option value="">Select...</option>{refereeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                    <div><label className="text-xs font-bold">R2</label><select className="w-full border p-2 rounded" value={match.referee2?.id || ""} onChange={e => { const r = refereeList.find(x => x.id === e.target.value); updateMatch({ referee2: { name: r?.name || '', country: r?.country || '', id: r?.id } }) }}><option value="">Select...</option>{refereeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                    <div className="flex gap-2 pt-2"><button onClick={() => updateMatch({ activeReferee: 1 })} className={`flex-1 py-2 rounded font-bold text-xs ${match.activeReferee === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Show R1</button><button onClick={() => updateMatch({ activeReferee: 2 })} className={`flex-1 py-2 rounded font-bold text-xs ${match.activeReferee === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Show R2</button></div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3">Starting Lineup</h3>
                                <div className="space-y-2">
                                    <button onClick={() => toggleView('lineup_A')} className={`w-full p-3 rounded font-bold border-2 ${match.activeView === 'lineup_A' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Team A Lineup</button>
                                    <button onClick={() => toggleView('lineup_B')} className={`w-full p-3 rounded font-bold border-2 ${match.activeView === 'lineup_B' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Team B Lineup</button>
                                    <div className="flex gap-2 mt-4"><button onClick={() => updateMatch({ lineupStep: 0 })} title="Reset Lineup" className="p-3 bg-slate-200 text-slate-600 rounded font-bold hover:bg-slate-300"><RotateCcw size={16} /></button><button onClick={() => updateMatch({ lineupStep: (match.lineupStep || 0) + 1 })} className="flex-1 p-3 bg-purple-600 text-white rounded font-bold flex justify-center items-center gap-2 hover:bg-purple-700"><Play size={16} /> Next Player ({match.lineupStep})</button></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl border p-4 flex flex-col overflow-hidden">
                            <h3 className="font-bold mb-4">Select Starting VI</h3>
                            <div className="flex-1 flex gap-4 overflow-hidden">
                                {[currentTeamA, currentTeamB].map((t, i) => {
                                    const list = i === 0 ? (match.lineupA || []) : (match.lineupB || []);
                                    // FIX: Filter count to only show players currently in the roster (ignores deleted players)
                                    const validCount = list.filter(id => t.roster?.some(p => p.id === id)).length;

                                    return (
                                        <div key={i} className="flex-1 overflow-y-auto">
                                            <div className={`text-xs font-bold uppercase mb-2 ${i === 0 ? 'text-blue-600' : 'text-red-600'}`}>{t.name} ({validCount}/6)</div>
                                            <div className="space-y-1">{(t.roster || []).map(p => {
                                                const field = i === 0 ? 'lineupA' : 'lineupB';
                                                // UPDATED: Ensure checked is boolean to fix React warning
                                                const checked = list.includes(p.id) || false;
                                                return (
                                                    <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded border cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                // FIX: Clean list of ghost IDs before checking limit to allow full selection
                                                                const cleanList = list.filter(id => t.roster?.some(r => r.id === id));
                                                                const newList = checked ? cleanList.filter(x => x !== p.id) : [...cleanList, p.id];

                                                                if (newList.length <= 6) updateMatch({ [field]: newList });
                                                            }}
                                                        />
                                                        <span className="font-mono bg-slate-100 px-1 rounded text-xs">#{p.number}</span>
                                                        <span className="text-sm font-bold">{p.name}</span>
                                                    </label>
                                                )
                                            })}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function TeamController({ name, data, serving, onScore, onSet, onColor, onTimeout, onServe, onAlert }) {
    if (!data) return null;
    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
            <div className="p-4 text-white flex justify-between items-center transition-colors" style={{ backgroundColor: data.color || '#333' }}>
                <h3 className="text-xl font-black uppercase truncate w-40">{name}</h3>
                <button onClick={onServe} className={`text-[10px] font-bold px-2 py-1 rounded-full ${serving ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}>{serving ? 'SERVING' : 'SERVE'}</button>
            </div>
            <div className="bg-slate-50 p-2 border-b flex justify-between items-center px-4">
                <input type="color" value={data.color || '#333333'} onChange={e => onColor(e.target.value)} className="w-6 h-6 rounded bg-transparent cursor-pointer" />
                {data.activeTimeout && <span className="text-xs font-bold text-red-500 animate-pulse">TIMEOUT ACTIVE</span>}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => onScore(-1)} className="p-4 bg-slate-100 rounded-xl hover:bg-slate-200"><Minus /></button>
                    <div className="text-7xl font-black text-slate-800">{data.score}</div>
                    <button onClick={() => onScore(1)} className="p-4 text-white rounded-xl shadow-lg active:scale-95" style={{ backgroundColor: data.color || '#333' }}><Plus /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="text-center">
                        <div className="text-xs font-bold text-slate-400 mb-1">SETS</div>
                        <div className="flex justify-center gap-2 items-center"><button onClick={() => onSet(-1)} className="p-1 bg-slate-100 rounded-full"><Minus size={12} /></button><span className="text-xl font-bold">{data.sets}</span><button onClick={() => onSet(1)} className="p-1 bg-slate-800 text-white rounded-full"><Plus size={12} /></button></div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-bold text-slate-400 mb-1">TIMEOUTS</div>
                        <div className="flex justify-center gap-2 items-center"><button onClick={() => onTimeout(-1)} className="p-1 bg-slate-100 rounded-full"><Minus size={12} /></button><span className="text-xl font-bold">{data.timeouts}</span><button onClick={() => onTimeout(1)} className="p-1 bg-indigo-100 text-[#2F36CF] rounded-full"><Plus size={12} /></button></div>
                        <button onClick={onAlert} className="text-[10px] mt-1 text-slate-400 font-bold hover:text-red-500">{data.activeTimeout ? 'End Alert' : 'Show Alert'}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Broadcast Overlay ---
function BroadcastOverlay({ matchId }) {
    const { matches, teams } = useVolleyballData();
    const matchList = Array.isArray(matches) ? matches : [];
    const teamList = Array.isArray(teams) ? teams : [];
    const match = matchList.find(m => m.id === matchId);
    const [introMode, setIntroMode] = useState(true);
    const [sponsorIdx, setSponsorIdx] = useState(0);

    const getLatestTeamData = (matchTeam) => {
        if (!matchTeam) return null;
        const latest = (teams || []).find(t => t.id === matchTeam.id);
        if (!latest) return matchTeam;
        return {
            ...matchTeam,
            name: latest.name,
            country: latest.country,
            logo: latest.logo,
            flag: latest.flag,
            roster: latest.roster
        };
    };

    // --- Standings Calculation Logic ---
    const calculateStandings = () => {
        const stats = {};
        teamList.forEach(t => {
            stats[t.id] = {
                ...t,
                played: 0, won: 0, lost: 0, points: 0,
                setsWon: 0, setsLost: 0,
                pointsWon: 0, pointsLost: 0
            };
        });

        matchList.filter(m => m.status === 'Finished').forEach(m => {
            const tA = stats[m.teamA.id];
            const tB = stats[m.teamB.id];

            if (!tA || !tB) return;

            tA.played++; tB.played++;
            tA.setsWon += m.teamA.sets; tA.setsLost += m.teamB.sets;
            tB.setsWon += m.teamB.sets; tB.setsLost += m.teamA.sets;

            if (m.teamA.sets > m.teamB.sets) {
                tA.won++; tB.lost++;
                if (m.teamB.sets === 2) { tA.points += 2; tB.points += 1; }
                else { tA.points += 3; tB.points += 0; }
            } else {
                tB.won++; tA.lost++;
                if (m.teamA.sets === 2) { tB.points += 2; tA.points += 1; }
                else { tB.points += 3; tA.points += 0; }
            }
        });

        return Object.values(stats).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.won !== a.won) return b.won - a.won;
            const setRatioA = a.setsLost === 0 ? 100 : a.setsWon / a.setsLost;
            const setRatioB = b.setsLost === 0 ? 100 : b.setsWon / b.setsLost;
            return setRatioB - setRatioA;
        });
    };

    const standings = calculateStandings();

    // Intro Sequence Effect
    useEffect(() => {
        if (match?.activeView === 'scoreboard' && match?.graphicsVisible) {
            setIntroMode(true);
            const timer = setTimeout(() => {
                setIntroMode(false);
            }, 4000); // 4 seconds intro
            return () => clearTimeout(timer);
        } else {
            setIntroMode(false);
        }
    }, [match?.activeView, match?.graphicsVisible]);

    // Sponsor Rotation Effect 
    useEffect(() => {
        if (match?.showBroadcastSponsors && (match?.broadcastSponsors?.length || 0) > 1) {
            const interval = setInterval(() => {
                setSponsorIdx(prev => (prev + 1) % match.broadcastSponsors.length);
            }, 5000); // Rotate every 5 seconds
            return () => clearInterval(interval);
        } else {
            setSponsorIdx(0); // Reset index if not rotating or only 1
        }
    }, [match?.broadcastSponsors, match?.showBroadcastSponsors]);

    if (!match || !match.teamA || !match.teamB) return <div className="text-white p-10">Waiting for data...</div>;

    const currentTeamA = getLatestTeamData(match.teamA);
    const currentTeamB = getLatestTeamData(match.teamB);

    const show = match.graphicsVisible;
    // Apply swap logic to the LATEST data
    const left = match.isSwapped ? currentTeamB : currentTeamA;
    const right = match.isSwapped ? currentTeamA : currentTeamB;
    const sL = match.serveVisible && match.serving === (match.isSwapped ? 'B' : 'A');
    const sR = match.serveVisible && match.serving === (match.isSwapped ? 'A' : 'B');

    // Referee Data (Manual selection)
    const currentRef = (match.activeReferee || 1) === 1 ? match.referee1 : match.referee2;
    const refTitle = (match.activeReferee || 1) === 1 ? "1ST REFEREE" : "2ND REFEREE";

    // Logic: Set/Match Point
    const setNum = (match.teamA.sets || 0) + (match.teamB.sets || 0) + 1;
    const limit = setNum === 5 ? 15 : 25;
    const getPointState = (s1, s2, sets) => {
        if (s1 >= limit && s1 >= s2 + 2) return null;

        if (s1 < limit - 1 || s1 <= s2) return null;
        if (sets === 2 || setNum === 5) return 'MATCH POINT';
        return 'SET POINT';
    }
    const statusL = getPointState(left.score || 0, right.score || 0, left.sets || 0);
    const statusR = getPointState(right.score || 0, left.score || 0, right.sets || 0);

    const allPlayers = [...(currentTeamA?.roster || []), ...(currentTeamB?.roster || [])];
    const activeP = allPlayers.find(p => p.id === match.activePlayerId);

    const isLeftPlayer = left.roster?.find(p => p.id === match.activePlayerId);
    const isRightPlayer = right.roster?.find(p => p.id === match.activePlayerId);
    const getTopLabel = (isTimeout, status) => {
        if (isTimeout) {
            return { text: "TIMEOUT", className: "animate-flash-timeout bg-[#dc2626]" };
        } else if (status) {
            return { text: status, className: "bg-[#2F36CF]" };
        }
        return null;
    };

    const topLabelL = getTopLabel(left.activeTimeout, statusL);
    const topLabelR = getTopLabel(right.activeTimeout, statusR);

    // --- Summary Helper ---
    const history = match.setHistory || [];
    const getSetScore = (teamSide, setIndex) => {
        const set = history.find(h => h.set === setIndex);
        if (!set) return "";
        const isTeamA = teamSide.id === match.teamA.id;
        return isTeamA ? set.scoreA : set.scoreB;
    };

    return (
        <div className="w-[1920px] h-[1080px] relative overflow-hidden font-sans bg-transparent">

            {/* --- LIVE STANDINGS (CENTER) --- */}
            {show && match.activeView === 'standings' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    {/* Container with "Nice Animation" (Slide Up + Fade + Scale) */}
                    <div className="flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.6)] border-2 border-white/20 rounded-xl overflow-hidden bg-slate-900/95 backdrop-blur-xl w-[1000px] animate-in slide-in-from-bottom-12 zoom-in-95 fade-in duration-700 ease-out">
                        {/* Header */}
                        <div className="bg-[#2F36CF] w-full h-24 flex justify-between items-center px-6 border-b border-white/10 relative overflow-hidden">
                            {/* Gloss effect */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>

                            <div className="flex items-center gap-6 z-10">
                                <img src="/img/ledlogo.png" className="h-16 w-auto object-contain drop-shadow-md" onError={(e) => e.target.style.display = 'none'} />
                                <h2 className="text-4xl font-black text-white uppercase italic tracking-wider drop-shadow-md">STANDINGS</h2>
                            </div>
                            <div className="text-xl font-bold text-white/80 tracking-widest uppercase z-10"></div>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 bg-white text-[#2F36CF] text-xl font-black uppercase tracking-wider py-4 border-b border-slate-200">
                            <div className="col-span-1 text-center">Pos</div>
                            <div className="col-span-5 pl-8">Team</div>
                            <div className="col-span-1 text-center">P</div>
                            <div className="col-span-1 text-center">W</div>
                            <div className="col-span-1 text-center">L</div>
                            <div className="col-span-3 text-center pr-6">Points</div>
                        </div>

                        {/* Rows */}
                        <div className="flex flex-col">
                            {standings.map((t, i) => {
                                // Highlight Top 2 Logic
                                const isTopTwo = i < 0;
                                return (
                                    <div key={t.id} className={`grid grid-cols-12 items-center py-4 border-b border-white/5 text-white transition-all duration-500 relative overflow-hidden ${isTopTwo ? 'bg-gradient-to-r from-yellow-500/20 to-transparent' : 'even:bg-white/5'}`}>

                                        {/* Top 2 Highlight Bar */}
                                        {isTopTwo && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-600 shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>}

                                        <div className="col-span-1 flex justify-center">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl shadow-lg border border-white/20 ${isTopTwo ? 'bg-orange-600 text-black scale-110' : 'bg-[#2F36CF] text-white'}`}>
                                                {i + 1}
                                            </div>
                                        </div>
                                        <div className="col-span-5 pl-8 flex items-center gap-4">
                                            {t.flag && <img src={t.flag} className="w-12 h-8 object-cover rounded shadow-md border border-white/10" />}
                                            <span className={`text-2xl font-bold uppercase tracking-tight ${isTopTwo ? 'text-orange-600 drop-shadow-sm' : 'text-white'}`}>{t.name}</span>

                                        </div>
                                        <div className="col-span-1 text-center text-2xl font-bold text-slate-400">{t.played}</div>
                                        <div className="col-span-1 text-center text-2xl font-bold text-green-400">{t.won}</div>
                                        <div className="col-span-1 text-center text-2xl font-bold text-red-400">{t.lost}</div>
                                        <div className="col-span-3 text-center pr-6">
                                            <span className={`text-4xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] ${isTopTwo ? 'text-orange-600 scale-110 inline-block' : 'text-white'}`}>{t.points}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MATCH SUMMARY (TOP LEFT) --- */}
            {show && match.activeView === 'summary' && (
                <div className="absolute top-10 left-10 z-50 animate-in slide-in-from-left-4 fade-in duration-500">
                    <div className="flex flex-col shadow-2xl border-2 border-white/20 rounded-xl overflow-hidden bg-slate-900/90 backdrop-blur">
                        <div className="bg-[#2F36CF] w-full h-16 flex justify-start items-center border-b border-white/10">
                            <img src="/img/ledlogo.png" className="h-full w-auto object-contain" onError={(e) => e.target.style.display = 'none'} />
                        </div>

                        {/* Column Headers */}
                        <div className="flex bg-slate-800 border-b border-white/10 text-xs font-bold text-slate-400">
                            <div className="w-[180px] p-2 pl-4">TEAMS</div>
                            <div className="w-16 flex items-center justify-center border-l border-white/10">TOTAL</div>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-16 flex items-center justify-center border-l border-white/10">SET {i}</div>
                            ))}
                        </div>

                        {/* Table Row 1 (Left Team) */}
                        <div className="flex h-16 border-b border-white/10 bg-white">
                            {/* Team Name + Flag */}
                            <div style={{ backgroundColor: left.color }} className="w-[180px] flex items-center justify-between px-4 relative overflow-hidden">
                                <span className="text-2xl font-black text-white uppercase relative z-10 drop-shadow-md truncate" style={{ color: getTextColor(left.color) }}>{left.country}</span>
                                {left.flag && <img src={left.flag} className="h-8 w-12 object-cover border border-white/20 shadow-sm z-10 ml-2" />}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
                            </div>
                            {/* Total Sets */}
                            <div className="w-16 bg-[#2F36CF] flex items-center justify-center text-white border-x border-slate-200">
                                <span className="text-4xl font-black leading-none">{left.sets}</span>
                            </div>
                            {/* Set Scores */}
                            {[1, 2, 3, 4, 5].map(i => {
                                const score = getSetScore(left, i);
                                const opponentScore = getSetScore(right, i);
                                const won = score > opponentScore && score !== "";
                                return (
                                    <div key={i} className="w-16 flex items-center justify-center border-r border-slate-200 last:border-0 bg-white">
                                        <span className={`text-2xl font-bold ${won ? 'text-black font-black' : 'text-slate-400'}`}>{score}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Table Row 2 (Right Team) */}
                        <div className="flex h-16 bg-white">
                            {/* Team Name + Flag */}
                            <div style={{ backgroundColor: right.color }} className="w-[180px] flex items-center justify-between px-4 relative overflow-hidden">
                                <span className="text-2xl font-black text-white uppercase relative z-10 drop-shadow-md truncate" style={{ color: getTextColor(right.color) }}>{right.country}</span>
                                {right.flag && <img src={right.flag} className="h-8 w-12 object-cover border border-white/20 shadow-sm z-10 ml-2" />}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
                            </div>
                            {/* Total Sets */}
                            <div className="w-16 bg-[#2F36CF] flex items-center justify-center text-white border-x border-slate-200">
                                <span className="text-4xl font-black leading-none">{right.sets}</span>
                            </div>
                            {/* Set Scores */}
                            {[1, 2, 3, 4, 5].map(i => {
                                const score = getSetScore(right, i);
                                const opponentScore = getSetScore(left, i);
                                const won = score > opponentScore && score !== "";
                                return (
                                    <div key={i} className="w-16 flex items-center justify-center border-r border-slate-200 last:border-0 bg-white">
                                        <span className={`text-2xl font-bold ${won ? 'text-black font-black' : 'text-slate-400'}`}>{score}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- REFEREE LOWER THIRD (CENTER BOTTOM) --- */}
            <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-700 z-50 ${show && match.activeView === 'referees' ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0'}`}>
                <div className="flex items-center shadow-2xl">
                    {/* Left Label Box */}
                    <div className="w-[200px] h-24 bg-[#2F36CF] text-white flex items-center justify-center border-r-2 border-black/10">
                        <span className="font-black text-xl uppercase tracking-wider">{refTitle}</span>
                    </div>
                    {/* Right Content Box */}
                    <div className="w-[600px] h-24 bg-white flex flex-col items-start justify-center px-8 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>

                        <div key={match.activeReferee || 1} className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div className="text-4xl font-black text-slate-900 uppercase leading-none mb-1">
                                {currentRef?.name || "Official"}
                            </div>
                            <div className="text-lg font-bold text-slate-500 uppercase tracking-widest">
                                {currentRef?.country || ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Scoreboard Container */}

            <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-700 z-40 ${show && (match.activeView === 'scoreboard' || match.activeView === 'full_time') ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0'}`}>

                <div className="relative flex items-center">

                    {(() => {
                        const isFullTime = match.activeView === 'full_time';

                        return (
                            <>
                                {/* --- SUBSTITUTION OVERLAY (LEFT SIDE) --- */}
                                {(() => {
                                    const s = match.subData || {};
                                    const isVisible = s.visible && s.teamId === left.id && !introMode && match.activeView === 'scoreboard';
                                    const pIn = left.roster?.find(p => p.id === s.inId);
                                    const pOut = left.roster?.find(p => p.id === s.outId);

                                    return (
                                        <div className={`absolute left-0 bottom-full mb-0 transition-all duration-500 ease-out z-[110] overflow-hidden ${isVisible && pIn && pOut ? 'w-[396px] opacity-100 h-32' : 'w-0 opacity-0 h-0'}`}>
                                            <div className="w-[396px] h-full flex flex-col shadow-xl">
                                                {/* IN PLAYER (TOP - GREEN) */}
                                                <div className="flex-1 bg-green-700 text-white flex items-center px-4 relative border-r-4 border-white/20">
                                                    <ArrowUpCircle className="text-white/80 mr-3 w-8 h-8" />
                                                    <span className="text-4xl font-black mr-4">{pIn?.number}</span>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-lg font-bold uppercase leading-none truncate">{pIn?.name}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">SUBSTITUTION IN</span>
                                                    </div>
                                                </div>
                                                {/* OUT PLAYER (BOTTOM - RED) */}
                                                <div className="flex-1 bg-red-800 text-white flex items-center px-4 relative border-r-4 border-white/20">
                                                    <ArrowDownCircle className="text-white/80 mr-3 w-8 h-8" />
                                                    <span className="text-4xl font-black mr-4 text-white/70">{pOut?.number}</span>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-lg font-bold uppercase leading-none truncate text-white/90">{pOut?.name}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">SUBSTITUTION OUT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* --- PLAYER OVERLAY (LEFT) --- */}
                                <div className={`absolute left-0 bottom-full h-24 flex items-center mb-0 transition-all duration-700 ease-in-out z-[100] overflow-hidden ${isLeftPlayer && !isFullTime ? 'w-[396px] opacity-100' : 'w-0 opacity-0'}`}>
                                    {activeP && isLeftPlayer && (
                                        <div className="w-[396px] h-24 bg-[#2F36CF] text-white flex items-center relative px-6 border-r-2 border-white/10 shadow-xl">
                                            <div className="flex-1 flex items-center justify-between gap-4">
                                                <span className="text-5xl font-black text-white">{activeP.number}</span>
                                                <div className="text-right overflow-hidden">
                                                    <div className="text-xl font-bold uppercase leading-tight whitespace-nowrap truncate">{activeP.name}</div>
                                                    <div className="text-sm text-white/70 font-bold uppercase tracking-widest">{activeP.position}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* LEFT SIDE GROUP */}
                                <div className="flex items-center z-10 relative">
                                    {topLabelL && !introMode && !isLeftPlayer && !isFullTime && (
                                        <div className={`absolute -top-8 left-0 h-8 flex items-center justify-center text-white text-sm font-black tracking-wider uppercase z-30 transition-all duration-300 w-[396px] shadow-lg ${topLabelL.className}`}>
                                            {topLabelL.text}
                                        </div>
                                    )}

                                    {/* Name Bar */}
                                    <div style={{ backgroundColor: left.color, width: isFullTime ? '550px' : (introMode ? '600px' : '300px') }} className="h-24 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center relative z-0 shadow-lg overflow-hidden">
                                        <span className="font-black uppercase whitespace-nowrap transition-all duration-500 text-5xl" style={{ color: getTextColor(left.color) }}>
                                            {(introMode || isFullTime) ? left.name : (left.country || left.name.substring(0, 3))}
                                        </span>
                                        {/* Flag - Intro Only */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-full overflow-hidden flex items-center justify-center transition-opacity duration-500 ${(introMode || isFullTime) ? 'opacity-20' : 'opacity-0'}`}>
                                            {left.flag && <img src={left.flag} className="w-full h-full object-cover" />}
                                        </div>

                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>
                                    </div>

                                    {/* Sets Box */}
                                    <div className={`h-24 bg-[#f05c22] text-white flex flex-col items-center justify-center border-r-2 border-black/10 z-10 overflow-hidden transition-all duration-1000 ${introMode ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
                                        <span className="text-[30px] font-bold uppercase leading-none mt-1 text-white/70">SETS</span>
                                        <span className="text-5xl font-black leading-none">{left.sets}</span>
                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                                    </div>

                                    {/* Score Box */}
                                    <div className={`h-24 bg-white text-slate-900 flex items-center justify-center z-20 overflow-hidden transition-all duration-1000 relative ${introMode || isFullTime ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}>
                                        <span key={left.score} className="text-6xl font-black animate-score-pop">{left.score}</span>
                                        <div className="absolute top-1 left-2 flex gap-1">{[...Array(left.timeouts)].map((_, i) => <div key={i} className="w-2 h-2 bg-red-500 rounded-full" />)}</div>
                                        {sL && <img src="/img/volleyball.png" className="w-5 absolute right-1 top-1 animate-spin-slow" />}
                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                                    </div>
                                </div>

                                {/* CENTER LOGO */}
                                <div className="z-30 h-24 w-36 bg-[#2F36CF] flex items-center justify-center shadow-2xl relative border-x-2 border-white/10">
                                    <div className="flex items-center justify-center w-full h-full relative z-20 bg-[#2F36CF]">
                                        <img src={match.tournamentLogo || "/img/logo.png"} className="h-20 w-20 object-contain" onError={(e) => e.target.style.display = 'none'} />
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>

                                    {/* SPONSOR LOGO BAR */}
                                    {match.showBroadcastSponsors && match.broadcastSponsors && match.broadcastSponsors.length > 0 && (
                                        <div className="absolute top-24 h-10 w-[140px] -ml-[2px] bg-white flex items-center justify-center shadow-xl border-x-2 border-b-2 border-white/10 rounded-b-2xl animate-in slide-in-from-top-6 -z-10 flex flex-col justify-end pb-1">
                                            {match.broadcastSponsors.length === 1 ? (
                                                <img src={match.broadcastSponsors[0]} className="h-10 w-32 object-contain" />
                                            ) : (
                                                <img key={sponsorIdx} src={match.broadcastSponsors[sponsorIdx]} className="h-10 w-32 object-contain animate-fade-cycle" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT SIDE GROUP */}
                                <div className="flex items-center z-10 flex-row-reverse relative">
                                    {topLabelR && !introMode && !isRightPlayer && !isFullTime && (
                                        <div className={`absolute -top-8 right-0 h-8 flex items-center justify-center text-white text-sm font-black tracking-wider uppercase z-30 transition-all duration-300 w-[396px] shadow-lg ${topLabelR.className}`}>
                                            {topLabelR.text}
                                        </div>
                                    )}

                                    {/* Name Bar */}
                                    <div style={{ backgroundColor: right.color, width: isFullTime ? '550px' : (introMode ? '600px' : '300px') }} className="h-24 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center relative z-0 shadow-lg overflow-hidden">
                                        <span className="font-black uppercase whitespace-nowrap transition-all duration-500 text-5xl" style={{ color: getTextColor(right.color) }}>
                                            {(introMode || isFullTime) ? right.name : (right.country || right.name.substring(0, 3))}
                                        </span>
                                        <div className={`absolute left-0 top-0 bottom-0 w-full overflow-hidden flex items-center justify-center transition-opacity duration-500 ${(introMode || isFullTime) ? 'opacity-20' : 'opacity-0'}`}>
                                            {right.flag && <img src={right.flag} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>
                                    </div>

                                    {/* Sets Box */}
                                    <div className={`h-24 bg-[#f05c22] text-white flex flex-col items-center justify-center border-l-2 border-black/10 z-10 overflow-hidden transition-all duration-1000 ${introMode ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
                                        <span className="text-[30px] font-bold uppercase leading-none mt-1 text-white/70">SETS</span>
                                        <span className="text-5xl font-black leading-none">{right.sets}</span>
                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                                    </div>

                                    {/* Score Box */}
                                    <div className={`h-24 bg-white text-slate-900 flex items-center justify-center z-20 overflow-hidden transition-all duration-1000 relative ${introMode || isFullTime ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}>
                                        <span key={right.score} className="text-6xl font-black animate-score-pop">{right.score}</span>
                                        <div className="absolute top-1 right-2 flex gap-1">{[...Array(right.timeouts)].map((_, i) => <div key={i} className="w-2 h-2 bg-red-500 rounded-full" />)}</div>
                                        {sR && <img src="/img/volleyball.png" className="w-5 absolute left-1 top-1 animate-spin-slow" />}
                                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                                    </div>
                                </div>

                                {/* --- PLAYER OVERLAY (RIGHT) --- */}
                                <div className={`absolute right-0 bottom-full h-24 flex items-center mb-0 transition-all duration-700 ease-in-out z-[100] overflow-hidden ${isRightPlayer && !isFullTime ? 'w-[396px] opacity-100' : 'w-0 opacity-0'}`}>
                                    {activeP && isRightPlayer && (
                                        <div className="w-[396px] h-24 bg-[#2F36CF] text-white flex items-center relative px-6 border-l-2 border-white/10 flex-row-reverse shadow-xl">
                                            <div className="flex-1 flex items-center justify-between flex-row-reverse gap-4">
                                                <span className="text-5xl font-black text-white">{activeP.number}</span>
                                                <div className="text-left overflow-hidden">
                                                    <div className="text-xl font-bold uppercase leading-tight whitespace-nowrap truncate">{activeP.name}</div>
                                                    <div className="text-sm text-white/70 font-bold uppercase tracking-widest">{activeP.position}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- SUBSTITUTION OVERLAY (RIGHT SIDE) --- */}
                                {(() => {
                                    const s = match.subData || {};
                                    const isVisible = s.visible && s.teamId === right.id && !introMode && match.activeView === 'scoreboard';
                                    const pIn = right.roster?.find(p => p.id === s.inId);
                                    const pOut = right.roster?.find(p => p.id === s.outId);

                                    return (
                                        <div className={`absolute right-0 bottom-full mb-0 transition-all duration-500 ease-out z-[110] overflow-hidden ${isVisible && pIn && pOut ? 'w-[396px] opacity-100 h-32' : 'w-0 opacity-0 h-0'}`}>
                                            <div className="w-[396px] h-full flex flex-col shadow-xl">
                                                {/* IN PLAYER (TOP - GREEN) */}
                                                <div className="flex-1 bg-green-700 text-white flex items-center px-4 relative border-l-4 border-white/20 flex-row-reverse text-right">
                                                    <ArrowUpCircle className="text-white/80 ml-3 w-8 h-8" />
                                                    <span className="text-4xl font-black ml-4">{pIn?.number}</span>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-lg font-bold uppercase leading-none truncate">{pIn?.name}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">SUBSTITUTION IN</span>
                                                    </div>
                                                </div>
                                                {/* OUT PLAYER (BOTTOM - RED) */}
                                                <div className="flex-1 bg-red-800 text-white flex items-center px-4 relative border-l-4 border-white/20 flex-row-reverse text-right">
                                                    <ArrowDownCircle className="text-white/80 ml-3 w-8 h-8" />
                                                    <span className="text-4xl font-black ml-4 text-white/70">{pOut?.number}</span>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-lg font-bold uppercase leading-none truncate text-white/90">{pOut?.name}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">SUBSTITUTION OUT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        );
                    })()}

                </div>

            </div>

            {/* Lineup Animation */}
            {show && (match.activeView === 'lineup_A' || match.activeView === 'lineup_B') && (
                <LineupDisplay
                    team={match.activeView === 'lineup_A' ? currentTeamA : currentTeamB}
                    ids={match.activeView === 'lineup_A' ? match.lineupA : match.lineupB}
                    step={match.lineupStep}
                />
            )}
        </div>
    )
}

// ... (Rest of the file: LineupDisplay and StadiumView remain unchanged)
// --- Lineup Display ---
// --- FIXED Lineup Display (Play Once & Pause) ---
function LineupDisplay({ team, ids, step }) {
    if (!team || !ids) return null;

    // 1. ROBUST URL RESOLVER
    const resolveUrl = (url) => {
        if (!url) return "";
        if (url.startsWith('data:') || url.startsWith('http')) return url;
        if (url.startsWith('/')) return url;
        return `/${url}`;
    };

    // 2. VIDEO DETECTION
    const isVideo = (url) => {
        if (!url) return false;
        return url.match(/\.(mov|mp4|webm)$/i) || url.includes('/uploads/') || url.startsWith('data:video/');
    };

    const lineup = (ids || []).map(id => team.roster?.find(p => p.id === id)).filter(Boolean);
    const showIntro = step === 0;
    const showSummary = step > lineup.length;
    const currentIdx = (step || 0) - 1;

    const featuredPlayer = (!showIntro && !showSummary && lineup[currentIdx]) ? lineup[currentIdx] : null;
    const historyPlayers = showSummary ? lineup : lineup.slice(0, currentIdx);

    const heroTextColor = getTextColor(team.color || '#333');

    return (
        <div className="absolute inset-0 z-[100] overflow-hidden font-sans text-white pointer-events-none">
            {/* Background Gradient */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${showSummary ? 'bg-slate-900/90' : 'bg-transparent'}`}></div>

            {/* Header */}
            <div className="absolute top-10 left-10 flex items-center gap-6 z-50 animate-in slide-in-from-top duration-700">
                <div className="w-28 h-16 bg-white shadow-2xl relative overflow-hidden flex items-center justify-center border-2 border-white/20">
                    {team.flag ? <img src={resolveUrl(team.flag)} className="w-full h-full object-cover" /> : <Flag className="text-slate-300" />}
                </div>
                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-white">
                    STARTING LINEUP
                </h1>
            </div>

            {/* Background Team Text */}
            <div className="absolute left-10 top-28 z-40 pointer-events-none text-7xl font-black uppercase leading-none" style={{ color: team.color || 'white' }}>
                {team.name.split('').map((char, i) => (
                    <span key={i} className="absolute inline-block drop-shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        style={{
                            left: showSummary ? `${i * 0.85}em` : '0em',
                            top: showSummary ? '0em' : `${i * 0.9}em`,
                            transitionDelay: `${i * 50}ms`,
                            textShadow: '6px 6px 0px rgba(0,0,0,0.5)',
                            width: '1.1em',
                            textAlign: 'center'
                        }}
                    >{char}</span>
                ))}
            </div>

            {/* --- 1. SINGLE PLAYER HERO VIEW --- */}
            {!showIntro && !showSummary && featuredPlayer && (
                <div className="absolute inset-0 flex">
                    <div className="w-[40%] h-full relative">
                        <div key={featuredPlayer.id} className="absolute inset-0 animate-slide-in-left">

                            {/* Big Number Background */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[500px] font-black text-white/20 select-none leading-none z-0">
                                {featuredPlayer.number}
                            </div>

                            <div className="absolute bottom-60 left-52 z-20 flex flex-col items-center">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[900px] flex items-end justify-center -z-10">

                                    {/* VIDEO RENDERER (Main Hero) */}
                                    {isVideo(featuredPlayer.photo) ? (
                                        <video
                                            src={resolveUrl(featuredPlayer.photo)}
                                            autoPlay
                                            muted
                                            playsInline
                                            // REMOVED 'loop' here
                                            className="h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                            style={{ backgroundColor: 'transparent' }}
                                            onError={(e) => console.error("Video Error:", e)}
                                        />
                                    ) : featuredPlayer.photo ? (
                                        <img src={resolveUrl(featuredPlayer.photo)} className="h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                                    ) : (
                                        <User className="h-1/2 w-1/2 text-white/10" />
                                    )}
                                </div>

                                {/* Name Plate */}
                                <div className="transform -skew-x-12 inline-block px-6 py-3 shadow-xl border-l-4 border-white/20 relative" style={{ backgroundColor: team.color || '#333', minWidth: '300px' }}>
                                    <div className="transform skew-x-12 text-center" style={{ color: heroTextColor }}>
                                        <div className="font-bold uppercase tracking-widest text-xs mb-1 opacity-80">{featuredPlayer.position}</div>
                                        <div className="flex items-end justify-center gap-3">
                                            <span className="text-6xl font-black leading-none">#{featuredPlayer.number}</span>
                                            <span className="text-4xl font-black uppercase italic leading-none whitespace-nowrap">{featuredPlayer.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side List */}
                    <div className="w-[60%] h-full relative flex flex-col justify-end pb-60 px-20 gap-4">
                        {historyPlayers.map((p) => (
                            <div key={p.id} className="w-full bg-slate-900/80 backdrop-blur-md border-l-8 text-white p-4 flex items-center justify-between shadow-lg animate-scale-in" style={{ borderColor: team.color }}>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full overflow-hidden border-2 border-white/20 relative">
                                        {/* VIDEO RENDERER (List Thumbnails) */}
                                        {isVideo(p.photo) ? (
                                            <video
                                                src={resolveUrl(p.photo)}
                                                className="w-full h-full object-cover"
                                                autoPlay muted playsInline
                                                // REMOVED 'loop' here
                                                style={{ backgroundColor: 'transparent' }}
                                            />
                                        ) : p.photo ? (
                                            <img src={resolveUrl(p.photo)} className="w-full h-full object-cover" />
                                        ) : <User className="p-4" />}
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black uppercase italic">{p.name}</div>
                                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{p.position}</div>
                                    </div>
                                </div>
                                <div className="text-5xl font-black text-white/20">#{p.number}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- 2. SUMMARY GRID VIEW --- */}
            {showSummary && (
                <div className="absolute inset-0 flex items-end justify-center px-10 pb-60 pt-64 animate-scale-in">
                    <div className="w-full h-full grid grid-cols-6 gap-4">
                        {historyPlayers.map((p) => (
                            <div key={p.id} className="relative bg-slate-900/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl group flex flex-col h-full">
                                <div className="absolute inset-0 z-0 flex items-end justify-center">
                                    <div className="absolute bottom-0 w-full h-3/4 opacity-60"
                                        style={{ background: `radial-gradient(circle at bottom, ${team.color || '#ea580c'} 0%, transparent 70%)` }}
                                    ></div>
                                    {/* VIDEO RENDERER (Summary) */}
                                    {isVideo(p.photo) ? (
                                        <video
                                            src={resolveUrl(p.photo)}
                                            autoPlay muted playsInline
                                            // REMOVED 'loop' here
                                            className="h-[95%] w-full object-contain object-bottom drop-shadow-lg"
                                            style={{ backgroundColor: 'transparent' }}
                                        />
                                    ) : p.photo ? (
                                        <img src={resolveUrl(p.photo)} className="h-[95%] w-full object-contain object-bottom drop-shadow-lg" />
                                    ) : <div className="h-full w-full flex items-center justify-center bg-white/5"><User className="h-20 w-20 text-white/20" /></div>}
                                </div>
                                <div className="absolute top-0 right-0 p-2 text-6xl font-black text-white/10 leading-none z-10">{p.number}</div>
                                <div className="absolute bottom-0 left-0 w-full p-4 pt-12 z-20"
                                    style={{ background: `linear-gradient(to top, ${team.color || '#ea580c'} 0%, ${team.color || '#ea580c'}E6 70%, transparent 100%)` }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="bg-black/50 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase">{p.position}</div>
                                        <div className="text-white font-black text-xl">#{p.number}</div>
                                    </div>
                                    <div className="text-xl font-bold text-white uppercase leading-none truncate" style={{ color: heroTextColor }}>{p.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubController({ team, side, match, updateMatch }) {
    if (!team) return null;

    // Helper to get safe sub data
    const subData = match.subData || { visible: false, teamId: null, inId: null, outId: null };
    const isActive = subData.visible && subData.teamId === team.id;
    const isThisTeamSelected = subData.teamId === team.id;

    const handleSub = (field, id) => {
        // If we switch teams, reset the other data
        const base = isThisTeamSelected ? subData : { visible: false, teamId: team.id, inId: null, outId: null };
        const newData = { ...base, teamId: team.id, [field]: id };
        updateMatch({ subData: newData });
    };

    const toggleGraphic = () => {
        if (!subData.inId || !subData.outId) {
            alert("Please select both players (IN and OUT)");
            return;
        }
        updateMatch({ subData: { ...subData, teamId: team.id, visible: !subData.visible } });
    };

    const clearSub = () => {
        updateMatch({ subData: { visible: false, teamId: null, inId: null, outId: null } });
    };

    // Sort roster by number for easier finding
    const sortedRoster = [...(team.roster || [])].sort((a, b) => parseInt(a.number) - parseInt(b.number));

    return (
        <div className="bg-slate-50 p-4 rounded-xl border-t-4 shadow-sm flex flex-col h-[500px]" style={{ borderColor: team.color }}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-lg uppercase text-slate-700 truncate">{team.name}</h4>
                {isActive && <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded font-bold animate-pulse">ON AIR</span>}
            </div>

            {/* SELECTION GRIDS */}
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                
                {/* 1. OUT GRID (Red) */}
                <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-red-500 flex items-center gap-1 mb-2 bg-red-50 p-1 rounded">
                        <ArrowDownCircle size={14}/> OUT (Leaving)
                    </label>
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 content-start">
                        {sortedRoster.map(p => {
                            const isSelected = isThisTeamSelected && subData.outId === p.id;
                            // Optional: Disable if selected in the IN column
                            const isDisabled = isThisTeamSelected && subData.inId === p.id;
                            
                            return (
                                <button
                                    key={p.id}
                                    disabled={isDisabled}
                                    onClick={() => handleSub('outId', p.id)}
                                    className={`p-2 rounded border flex flex-col items-center transition-all ${
                                        isSelected 
                                            ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-300' 
                                            : isDisabled 
                                                ? 'bg-slate-100 text-slate-300 opacity-50 cursor-not-allowed'
                                                : 'bg-white hover:bg-red-50 hover:border-red-200'
                                    }`}
                                >
                                    <span className="text-xl font-black">{p.number}</span>
                                    <span className="text-[10px] font-bold uppercase truncate w-full text-center">{p.name.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. IN GRID (Green) */}
                <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-green-600 flex items-center gap-1 mb-2 bg-green-50 p-1 rounded">
                        <ArrowUpCircle size={14}/> IN (Entering)
                    </label>
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 content-start">
                        {sortedRoster.map(p => {
                            const isSelected = isThisTeamSelected && subData.inId === p.id;
                            const isDisabled = isThisTeamSelected && subData.outId === p.id;

                            return (
                                <button
                                    key={p.id}
                                    disabled={isDisabled}
                                    onClick={() => handleSub('inId', p.id)}
                                    className={`p-2 rounded border flex flex-col items-center transition-all ${
                                        isSelected 
                                            ? 'bg-green-600 text-white border-green-700 shadow-md ring-2 ring-green-300' 
                                            : isDisabled 
                                                ? 'bg-slate-100 text-slate-300 opacity-50 cursor-not-allowed'
                                                : 'bg-white hover:bg-green-50 hover:border-green-200'
                                    }`}
                                >
                                    <span className="text-xl font-black">{p.number}</span>
                                    <span className="text-[10px] font-bold uppercase truncate w-full text-center">{p.name.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-4 pt-4 border-t flex gap-2">
                <button 
                    onClick={toggleGraphic}
                    className={`flex-1 py-4 rounded-xl font-black text-white text-sm shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-1 ${isActive ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isActive ? (
                        <>
                            <span className="flex items-center gap-2"><ArrowDownCircle size={16}/> HIDE GRAPHIC</span>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-2"><ArrowUpCircle size={16}/> PUSH TO SCREEN</span>
                            <span className="text-[10px] opacity-70 font-normal">CLICK TO SHOW</span>
                        </>
                    )}
                </button>
                <button 
                    onClick={clearSub} 
                    className="w-16 bg-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-300 hover:text-red-500 flex flex-col items-center justify-center text-[10px]"
                >
                    <Trash2 size={16} className="mb-1"/>
                    CLR
                </button>
            </div>
        </div>
    )
}

// --- Stadium / LED View ( 1:1 & 16:9) ---
// --- UPDATED STADIUM VIEW (With Subs) ---
function StadiumView({ matchId }) {
    const { matches, teams } = useVolleyballData();
    const matchList = Array.isArray(matches) ? matches : [];
    const match = matchList.find(m => m.id === matchId);
    const [sponsorIdx, setSponsorIdx] = useState(0);

    const serverUrl = window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
    const resolveUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('data:') || url.startsWith('http')) return url;
        return url.startsWith('/') ? `${serverUrl}${url}` : url;
    };

    const getLatestTeamData = (matchTeam) => {
        if (!matchTeam) return null;
        const latest = (teams || []).find(t => t.id === matchTeam.id);
        if (!latest) return matchTeam;
        return { ...matchTeam, ...latest };
    };

    useEffect(() => {
        if (match?.showLedSponsors && (match?.ledSponsors?.length || 0) > 1) {
            const interval = setInterval(() => {
                setSponsorIdx(prev => (prev + 1) % match.ledSponsors.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [match?.ledSponsors, match?.showLedSponsors]);

    if (!match) return <div className="w-screen h-screen bg-black flex items-center justify-center text-white font-bold animate-pulse">Waiting for Match Data...</div>;
    if (!match.teamA || !match.teamB) return <div className="w-screen h-screen bg-black flex items-center justify-center text-white font-bold">Waiting for Teams...</div>;

    const currentTeamA = getLatestTeamData(match.teamA);
    const currentTeamB = getLatestTeamData(match.teamB);
    const left = match.isSwapped ? currentTeamB : currentTeamA;
    const right = match.isSwapped ? currentTeamA : currentTeamB;

    const leftColor = left?.color || '#333';
    const rightColor = right?.color || '#333';

    const sL = match.serveVisible && match.serving === (match.isSwapped ? 'B' : 'A');
    const sR = match.serveVisible && match.serving === (match.isSwapped ? 'A' : 'B');
    const isSquare = match.ledAspectRatio === '1:1';

    // --- SUB DATA LOGIC ---
    const sData = match.subData || {};
    const subActive = sData.visible;
    const subTeamId = sData.teamId;
    
    // Helper to render Sub Overlay inside a team card
    const renderSubOverlay = (team) => {
        if (!subActive || subTeamId !== team.id) return null;
        
        const pIn = team.roster?.find(p => p.id === sData.inId);
        const pOut = team.roster?.find(p => p.id === sData.outId);
        
        if(!pIn || !pOut) return null;

        return (
            <div className="absolute inset-0 z-50 flex flex-col animate-in zoom-in duration-300">
                {/* IN (Green) */}
                <div className="flex-1 bg-green-600 flex items-center justify-between px-4 border-b border-black/20">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold uppercase text-green-200">IN</span>
                        <span className="text-2xl font-black uppercase leading-none truncate w-32">{pIn.name}</span>
                    </div>
                    <span className="text-7xl font-black">{pIn.number}</span>
                </div>
                {/* OUT (Red) */}
                <div className="flex-1 bg-red-600 flex items-center justify-between px-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold uppercase text-red-200">OUT</span>
                        <span className="text-2xl font-black uppercase leading-none truncate w-32">{pOut.name}</span>
                    </div>
                    <span className="text-7xl font-black text-white/80">{pOut.number}</span>
                </div>
            </div>
        );
    };

    const getSetResult = (teamSide, setIndex) => {
        const history = match.setHistory || [];
        const set = history.find(h => h.set === setIndex);
        if (!set) return { score: "-", isWinner: false };
        const isTeamA = teamSide.id === match.teamA.id;
        const myScore = isTeamA ? set.scoreA : set.scoreB;
        const otherScore = isTeamA ? set.scoreB : set.scoreA;
        return { score: myScore, isWinner: parseInt(myScore) > parseInt(otherScore) };
    };

    return (
        <div className="w-screen h-screen bg-black text-white flex flex-col font-sans overflow-hidden relative">
            <div className="absolute inset-0 bg-slate-900 z-0"></div>

            {isSquare ? (
                 /* 1:1 SQUARE LAYOUT */
                <div className="w-full h-full flex items-center justify-center p-4">
                    <div className="relative z-10 aspect-square h-full max-h-screen flex flex-col gap-2 bg-black border border-white/10 p-2">
                        {/* Header */}
                        <div className="h-[15%] w-full flex justify-between items-center bg-[#2F36CF] rounded mb-1 px-4 relative overflow-hidden">
                            <img src="/img/ledlogo.png" className="h-[80%] object-contain z-10" onError={(e)=>e.target.style.display='none'} />
                            {match.showLedSponsors && (
                                <div className="h-[90%] w-[40%] bg-white rounded flex items-center justify-center p-1">
                                    {match.ledSponsors?.length > 0 ? 
                                        <img src={resolveUrl(match.ledSponsors[sponsorIdx])} className="h-full object-contain"/> : 
                                        <span className="text-black text-[10px] font-bold">SPONSOR</span>
                                    }
                                </div>
                            )}
                        </div>

                        {/* Main Scoreboard */}
                        <div className="h-[50%] w-full flex gap-1">
                            {/* LEFT TEAM CARD */}
                            <div className="flex-1 bg-slate-800 rounded border-l-8 flex flex-col items-center p-2 relative overflow-hidden" style={{ borderLeftColor: leftColor }}>
                                {renderSubOverlay(left)} {/* <-- SUB OVERLAY INJECTED HERE */}
                                
                                {sL && <div className="absolute left-1 top-1 text-yellow-400">●</div>}
                                <div className="h-[30%] w-full flex justify-center bg-black/30 rounded">
                                    {left.flag ? <img src={resolveUrl(left.flag)} className="h-full object-contain" /> : <Flag />}
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-[18vh] font-black leading-none">{left.score}</span>
                                </div>
                            </div>

                            {/* RIGHT TEAM CARD */}
                            <div className="flex-1 bg-slate-800 rounded border-l-8 flex flex-col items-center p-2 relative overflow-hidden" style={{ borderLeftColor: rightColor }}>
                                {renderSubOverlay(right)} {/* <-- SUB OVERLAY INJECTED HERE */}
                                
                                {sR && <div className="absolute left-1 top-1 text-yellow-400">●</div>}
                                <div className="h-[30%] w-full flex justify-center bg-black/30 rounded">
                                    {right.flag ? <img src={resolveUrl(right.flag)} className="h-full object-contain" /> : <Flag />}
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-[18vh] font-black leading-none">{right.score}</span>
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="h-[35%] w-full bg-slate-800 rounded flex flex-col mt-1">
                             <div className="flex h-8 bg-slate-700 items-center text-xs font-bold text-slate-400">
                                <div className="w-16 text-center">TEAM</div>
                                {[1,2,3,4,5].map(i=><div key={i} className="flex-1 text-center">{i}</div>)}
                             </div>
                             {/* Row A */}
                             <div className="flex-1 flex items-center border-b border-white/5">
                                 <div className="w-16 h-full p-1 flex justify-center">{left.flag && <img src={resolveUrl(left.flag)} className="h-full object-contain"/>}</div>
                                 {[1,2,3,4,5].map(i => {
                                     const r = getSetResult(left, i);
                                     return <div key={i} className={`flex-1 text-center font-bold text-2xl ${r.isWinner ? 'text-yellow-400' : 'text-white/30'}`}>{r.score}</div>
                                 })}
                             </div>
                             {/* Row B */}
                             <div className="flex-1 flex items-center">
                                 <div className="w-16 h-full p-1 flex justify-center">{right.flag && <img src={resolveUrl(right.flag)} className="h-full object-contain"/>}</div>
                                 {[1,2,3,4,5].map(i => {
                                     const r = getSetResult(right, i);
                                     return <div key={i} className={`flex-1 text-center font-bold text-2xl ${r.isWinner ? 'text-yellow-400' : 'text-white/30'}`}>{r.score}</div>
                                 })}
                             </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* 16:9 STANDARD LAYOUT (Existing code preserved) */
                <div className="w-full h-full p-10 flex flex-col">
                    <div className="flex justify-center mb-8">
                         <img src={match.tournamentLogo ? resolveUrl(match.tournamentLogo) : "/img/cava_logo.png"} className="h-32 object-contain" onError={(e)=>e.target.style.display='none'} />
                    </div>
                    
                    <div className="flex-1 flex items-center gap-10">
                        {/* Left Team */}
                        <div className="flex-1 bg-slate-800 rounded-3xl p-8 flex flex-col items-center border-t-8 shadow-2xl relative overflow-hidden" style={{ borderColor: leftColor }}>
                             {renderSubOverlay(left)}
                             <div className="w-full h-48 bg-black rounded-xl mb-4 overflow-hidden relative">
                                 {left.flag ? <img src={resolveUrl(left.flag)} className="w-full h-full object-cover"/> : <Flag className="w-full h-full text-slate-600"/>}
                             </div>
                             <h2 className="text-5xl font-black uppercase text-center mb-4 leading-tight">{left.name}</h2>
                             <span className="text-[250px] font-black leading-none">{left.score}</span>
                        </div>

                        {/* Center Info */}
                        <div className="w-[400px] flex flex-col items-center gap-6">
                            <div className="bg-white/10 px-8 py-2 rounded-full text-2xl font-black uppercase tracking-widest">SETS</div>
                            <div className="flex items-center gap-4 text-9xl font-black">
                                <span className="text-yellow-400">{left.sets}</span>
                                <span className="text-slate-600">-</span>
                                <span className="text-yellow-400">{right.sets}</span>
                            </div>
                             {match.showLedSponsors && match.ledSponsors?.length > 0 && (
                                <div className="w-full h-40 bg-white rounded-xl flex items-center justify-center p-4 mt-8">
                                    <img src={resolveUrl(match.ledSponsors[sponsorIdx])} className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>

                        {/* Right Team */}
                        <div className="flex-1 bg-slate-800 rounded-3xl p-8 flex flex-col items-center border-t-8 shadow-2xl relative overflow-hidden" style={{ borderColor: rightColor }}>
                             {renderSubOverlay(right)}
                             <div className="w-full h-48 bg-black rounded-xl mb-4 overflow-hidden relative">
                                 {right.flag ? <img src={resolveUrl(right.flag)} className="w-full h-full object-cover"/> : <Flag className="w-full h-full text-slate-600"/>}
                             </div>
                             <h2 className="text-5xl font-black uppercase text-center mb-4 leading-tight">{right.name}</h2>
                             <span className="text-[250px] font-black leading-none">{right.score}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}