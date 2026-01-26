import React, { useState, useEffect, useMemo } from 'react';
import { Flag, Shield, ChevronsUp, ChevronsDown } from 'lucide-react';
import { useVolleyballData } from '../context/VolleyballContext';

export default function StadiumView({ matchId }) {
    const { matches, teams } = useVolleyballData();
    const matchList = Array.isArray(matches) ? matches : [];
    const match = matchList.find(m => m.id === matchId);
    const [sponsorIdx, setSponsorIdx] = useState(0);

    // --- 1. SMART SERVER URL DETECTION ---
    const getBaseUrl = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('server') || window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
        } catch (e) {
            return 'http://localhost:3001';
        }
    };
    const serverUrl = getBaseUrl();

    // --- 2. ROBUST URL RESOLVER ---
    const resolveUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;

        let path = url;
        if (url.startsWith('http')) {
            try {
                const u = new URL(url);
                if (u.port === '3001' || u.pathname.includes('/uploads/') || u.pathname.includes('/img/')) {
                    path = u.pathname + u.search; 
                } else {
                    return url;
                }
            } catch (e) {}
        }
        const cleanServer = serverUrl.replace(/\/$/, ""); 
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanServer}${cleanPath}`;
    };

    const getTeam = (matchTeam) => {
        if (!matchTeam) return {};
        const latest = (teams || []).find(t => t.id === matchTeam.id);
        return latest ? { ...matchTeam, ...latest } : matchTeam;
    };

    // Sponsor Rotation
    useEffect(() => {
        if (match?.showLedSponsors && (match?.ledSponsors?.length || 0) > 1) {
            const interval = setInterval(() => {
                setSponsorIdx(prev => (prev + 1) % match.ledSponsors.length);
            }, 5000);
            return () => clearInterval(interval);
        } else {
            setSponsorIdx(0);
        }
    }, [match?.ledSponsors, match?.showLedSponsors]);

    if (!match) return <div className="text-white p-10 bg-black h-screen flex items-center justify-center">Waiting for data...</div>;

    const left = match.isSwapped ? getTeam(match.teamB) : getTeam(match.teamA);
    const right = match.isSwapped ? getTeam(match.teamA) : getTeam(match.teamB);
    const isSquare = match.ledAspectRatio === '1:1';

    // --- LINEUP OVERLAY ---
    if (match.graphicsVisible && (match.activeView === 'lineup_A' || match.activeView === 'lineup_B')) {
        const team = match.activeView === 'lineup_A' ? getTeam(match.teamA) : getTeam(match.teamB);
        const ids = match.activeView === 'lineup_A' ? match.lineupA : match.lineupB;
        return (
            <LedLineupOverlay 
                team={team} 
                ids={ids} 
                step={match.lineupStep || 0} 
                resolveUrl={resolveUrl} 
                isSquare={isSquare} 
            />
        );
    }

    return (
        <div className="w-screen h-screen bg-black text-white flex flex-col font-sans overflow-hidden relative">
            <style>{`
                .animate-arrows-up { animation: slide-up 0.6s linear infinite; }
                .animate-arrows-down { animation: slide-down 0.6s linear infinite; }
                @keyframes slide-up { 0% { transform: translateY(20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-20px); opacity: 0; } }
                @keyframes slide-down { 0% { transform: translateY(-20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }
            `}</style>
            
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80 z-0"></div>
            
            {isSquare ? (
                // --- SQUARE LAYOUT (1:1) PROFESSIONAL DARK MODE ---
                <div className="w-full h-full flex items-center justify-center p-4">
                    <div className="relative z-10 aspect-square h-full max-h-screen flex flex-col gap-1 bg-black shadow-2xl p-1">
                        
                        {/* Header */}
                        <div className="h-[12%] w-full flex justify-between items-center bg-[#F06022] rounded border-b border-white/20 px-4 shadow-lg relative overflow-hidden">
                            <img src="/img/ledlogo.png" className="h-[90%] object-contain drop-shadow-md z-10" onError={(e) => e.target.style.display = 'none'} />
                            {match.showLedSponsors && (
                                <div className="h-[90%] w-[40%] flex items-center justify-center bg-white rounded p-1 z-10 shadow-sm">
                                    {match.ledSponsors?.length > 0 ? (
                                        <img key={sponsorIdx} src={resolveUrl(match.ledSponsors[sponsorIdx])} className="w-full h-full object-contain animate-fade-cycle" />
                                    ) : <span className="text-[10px] text-slate-300 font-bold">SPONSOR</span>}
                                </div>
                            )}
                        </div>

                        {/* Main Score Area (Dynamic) */}
                        <div className="h-[60%] w-full flex gap-1">
                            <TeamCard 
                                team={left} 
                                match={match} 
                                resolveUrl={resolveUrl} 
                            />
                            <TeamCard 
                                team={right} 
                                match={match} 
                                resolveUrl={resolveUrl} 
                            />
                        </div>

                        {/* History Table */}
                        <div className="h-[28%] w-full bg-black/50 rounded border border-white/10 flex flex-col shadow-inner overflow-hidden">
                             {/* Header */}
                             <div className="flex bg-white/10 h-[25%] items-center border-b border-white/10">
                                <div className="w-20 flex items-center justify-center border-r border-white/10"><Shield size={20} className="text-slate-400" /></div>
                                {[1, 2, 3, 4, 5].map(i => (<div key={i} className="flex-1 h-full flex items-center justify-center font-bold text-slate-400 border-l border-white/10 text-3xl">{i}</div>))}
                            </div>
                            
                            {/* Left Row */}
                            <div className="flex-1 flex items-center border-b border-white/5">
                                {/* SHOW SHORT NAME INSTEAD OF FLAG */}
                                <div className="w-20 h-full p-2 flex items-center justify-center border-r border-white/10">
                                    <span className="font-black text-3xl text-white tracking-wider">
                                        {left.shortName || (left.name ? left.name.substring(0, 3).toUpperCase() : "A")}
                                    </span>
                                </div>
                                {[1, 2, 3, 4, 5].map(i => {
                                    const set = match.setHistory?.find(h => h.set === i);
                                    const score = set ? (match.teamA.id === left.id ? set.scoreA : set.scoreB) : "";
                                    const isWin = set && ((match.teamA.id === left.id && set.scoreA > set.scoreB) || (match.teamB.id === left.id && set.scoreB > set.scoreA));
                                    return (
                                        <div key={i} className={`flex-1 h-full flex items-center justify-center border-r border-white/10 last:border-0 ${isWin ? 'bg-yellow-500/20 text-yellow-400' : 'text-white'}`}>
                                            <span className="text-5xl font-black">{score}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Right Row */}
                            <div className="flex-1 flex items-center">
                                {/* SHOW SHORT NAME INSTEAD OF FLAG */}
                                <div className="w-20 h-full p-2 flex items-center justify-center border-r border-white/10">
                                    <span className="font-black text-3xl text-white tracking-wider">
                                        {right.shortName || (right.name ? right.name.substring(0, 3).toUpperCase() : "B")}
                                    </span>
                                </div>
                                {[1, 2, 3, 4, 5].map(i => {
                                    const set = match.setHistory?.find(h => h.set === i);
                                    const score = set ? (match.teamA.id === right.id ? set.scoreA : set.scoreB) : "";
                                    const isWin = set && ((match.teamA.id === right.id && set.scoreA > set.scoreB) || (match.teamB.id === right.id && set.scoreB > set.scoreA));
                                    return (
                                        <div key={i} className={`flex-1 h-full flex items-center justify-center border-r border-white/10 last:border-0 ${isWin ? 'bg-yellow-500/20 text-yellow-400' : 'text-white'}`}>
                                            <span className="text-5xl font-black">{score}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- WIDESCREEN (16:9) ---
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-4xl text-white">Widescreen View (Not configured in this update)</div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// TEAM CARD COMPONENT (Handles Resizing & Subs)
// ==========================================
function TeamCard({ team, match, resolveUrl }) {
    const sData = match.subData || {};
    const isSubActive = match.graphicsVisible && match.activeView === 'substitution' && sData.visible && sData.teamId === team.id;
    
    // Auto-timeout check
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (team.activeTimeout) {
            const interval = setInterval(() => setNow(Date.now()), 500); 
            return () => clearInterval(interval);
        }
    }, [team.activeTimeout]);
    const isTimeout = team.activeTimeout && team.timeoutExpires && team.timeoutExpires > now;

    // Sub Logic (4-PHASE ANIMATION)
    const [subPhase, setSubPhase] = useState(null);
    useEffect(() => { 
        if (isSubActive) { 
            setSubPhase('arrows-in'); 
            const t1 = setTimeout(() => setSubPhase('show-in'), 2000); 
            const t2 = setTimeout(() => setSubPhase('arrows-out'), 5000); 
            const t3 = setTimeout(() => setSubPhase('show-out'), 7000); 
            const t4 = setTimeout(() => setSubPhase('done'), 10000); 
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); }; 
        } else { 
            setSubPhase(null); 
        } 
    }, [isSubActive, sData.inId, sData.outId]);

    // Determine if we need to resize score
    const isOverlayActive = (isSubActive && subPhase && subPhase !== 'done') || isTimeout;

    return (
        <div className="flex-1 bg-gradient-to-b from-slate-800 to-black rounded border-t-4 border-slate-700 flex flex-col items-center relative overflow-hidden group transition-all" style={{ borderTopColor: team.color }}>
            
            {/* 1. TOP SECTION (Always Visible) */}
            <div className={`w-full flex flex-col items-center transition-all duration-500 ${isOverlayActive ? 'h-[25%]' : 'h-[35%]'}`}>
                <div className={`w-[80%] relative transition-all duration-500 flex items-end justify-center ${isOverlayActive ? 'h-[60%] mt-1' : 'h-[75%] mt-2'}`}>
                    {team.flag ? <img src={resolveUrl(team.flag)} className="h-full w-auto object-contain drop-shadow-xl" /> : <Flag className="text-slate-600 m-auto h-full w-auto" />}
                </div>
                <div className="w-full flex items-center justify-center px-1 mt-1">
                    <h2 className={`font-black uppercase text-white tracking-tight leading-none drop-shadow-md truncate w-full text-center transition-all duration-500 ${isOverlayActive ? 'text-[3vh]' : 'text-[6vh]'}`}>
                        {team.country || team.name}
                    </h2>
                </div>
            </div>

            {/* 2. SCORE SECTION (Resizes) */}
            <div className={`w-full flex items-center justify-center transition-all duration-500 ${isOverlayActive ? 'h-[40%] bg-black/40' : 'h-[65%]'}`}>
                <span className={`font-black leading-none text-white tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-500 ${isOverlayActive ? 'text-[15vh]' : 'text-[28vh]'}`}>
                    {team.score}
                </span>
            </div>

            {/* 3. BOTTOM OVERLAY SECTION (Slides Up - 25% Height) */}
            <div className={`absolute bottom-0 left-0 w-full bg-slate-900 transition-all duration-500 overflow-hidden ${isOverlayActive ? 'h-[25%]' : 'h-0'}`}>
                
                {/* SUB OVERLAY (Phased Animation) */}
                {isSubActive && subPhase && (
                    <SubOverlayContent team={team} sData={sData} subPhase={subPhase} />
                )}

                {/* TIMEOUT OVERLAY */}
                {isTimeout && (
                    <div className="w-full h-full bg-[#f05c22] flex flex-col items-center justify-center border-t-4 border-white animate-pulse">
                        <span className="text-3xl font-black text-white uppercase tracking-widest">TIMEOUT {team.timeouts || 1}</span>
                        <div className="bg-black/20 px-4 rounded mt-1">
                            <span className="text-7xl font-mono font-bold text-white">
                                {Math.max(0, Math.ceil((team.timeoutExpires - now) / 1000))}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub Overlay Logic (Broadcast Phases: Arrows -> In -> Arrows -> Out)
function SubOverlayContent({ team, sData, subPhase }) {
    if (subPhase === 'arrows-in' || subPhase === 'arrows-out') {
        const isUp = subPhase === 'arrows-in';
        const accentColor = isUp ? 'text-green-500' : 'text-red-500';
        const animateClass = isUp ? 'animate-arrows-up' : 'animate-arrows-down';
        const Icon = isUp ? ChevronsUp : ChevronsDown;
        return (
            <div className="w-full h-full bg-black/80 flex items-center justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                    <Icon key={i} size={64} strokeWidth={4} className={`${accentColor} ${animateClass}`} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
            </div>
        );
    }

    const pIn = team.roster?.find(p => p.id === sData.inId);
    const pOut = team.roster?.find(p => p.id === sData.outId);
    
    if (subPhase === 'show-in' && pIn) {
        return (
            <div className="w-full h-full bg-green-700 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <span className="text-xl font-black text-green-200 uppercase tracking-widest">SUBSTITUTION IN</span>
                <div className="flex items-center gap-4 w-full px-4 justify-center">
                    <span className="text-6xl font-black text-white">{pIn.number}</span>
                    <span className="text-2xl font-bold text-white uppercase truncate flex-1 leading-tight">{pIn.name}</span>
                </div>
            </div>
        );
    }

    if (subPhase === 'show-out' && pOut) {
        return (
            <div className="w-full h-full bg-red-700 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <span className="text-xl font-black text-red-200 uppercase tracking-widest">SUBSTITUTION OUT</span>
                <div className="flex items-center gap-4 w-full px-4 justify-center">
                    <span className="text-6xl font-black text-white">{pOut.number}</span>
                    <span className="text-2xl font-bold text-white uppercase truncate flex-1 leading-tight">{pOut.name}</span>
                </div>
            </div>
        );
    }
    return null;
}

// ==========================================
// LED LINEUP OVERLAY (Unchanged)
// ==========================================
function LedLineupOverlay({ team, ids, step, resolveUrl, isSquare }) {
    const players = useMemo(() => {
        let list = (ids || []).map(id => team.roster?.find(p => p.id === id)).filter(Boolean);
        if (list.length < 7) list = [...list, ...Array(7 - list.length).fill(null)];
        return { sequence: list, summary: list };
    }, [ids, team.roster]);

    const showIntro = step === 0;
    const showSummary = step > 7;
    const currentPlayer = (!showIntro && !showSummary) ? players.sequence[step - 1] : null;
    const isVideo = (url) => url && (url.match(/\.(webm|mp4|mov)$/i) || url.startsWith('data:video'));

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a2a4a_0%,_#000_100%)] opacity-80"></div>
            
            <div className={`absolute transition-all duration-1000 ease-in-out z-20 flex ${showIntro ? 'flex-col items-center' : 'flex-row items-center gap-6'}`} style={{ top: showIntro ? '50%' : '40px', left: showIntro ? '50%' : '40px', transform: showIntro ? 'translate(-50%, -50%) scale(1)' : 'translate(0, 0) scale(0.8)', transformOrigin: 'top left' }}>
                <div className={`flex items-center gap-6 transition-all duration-1000 ${showIntro ? 'mb-8' : 'mb-0'}`}>
                    {team.flag && <img src={resolveUrl(team.flag)} className={`${isSquare ? 'h-32' : 'h-48'} object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`} />}
                    {team.logo && <img src={resolveUrl(team.logo)} className={`${isSquare ? 'h-32' : 'h-48'} object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`} />}
                    {!team.flag && !team.logo && <Shield size={160} className="text-slate-600" />}
                </div>
                <div className={`flex flex-col ${showIntro ? 'items-center text-center' : 'items-start text-left'}`}>
                    <h1 className={`${isSquare ? 'text-6xl' : 'text-8xl'} font-black uppercase text-white italic tracking-tighter drop-shadow-lg leading-none`}>STARTING LINEUP</h1>
                    <h2 className={`${isSquare ? 'text-4xl' : 'text-6xl'} font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mt-2 tracking-widest`}>{team.name}</h2>
                </div>
            </div>

            {currentPlayer && (
                <div className="flex-1 flex relative z-10">
                    <div className={`absolute bottom-0 ${isSquare ? 'right-0 w-3/4' : 'right-20 w-1/2'} h-[90%] flex items-end justify-end animate-in slide-in-from-right duration-500`}>
                        {isVideo(currentPlayer.photo) ? (<video src={resolveUrl(currentPlayer.photo)} autoPlay muted playsInline className="h-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]" />) : (<img src={resolveUrl(currentPlayer.photo)} className="h-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]" />)}
                    </div>
                    <div className={`absolute ${isSquare ? 'bottom-10 left-4' : 'bottom-20 left-20'} flex flex-col gap-2 animate-in slide-in-from-left duration-500`}>
                        <div className="bg-yellow-400 text-black px-6 py-2 text-4xl font-black uppercase tracking-widest inline-block skew-x-[-10deg] w-max shadow-lg">{currentPlayer.number}</div>
                        <div className="bg-slate-900/90 border-l-8 border-yellow-400 p-6 shadow-2xl skew-x-[-10deg]"><h2 className={`${isSquare ? 'text-6xl' : 'text-8xl'} font-black text-white uppercase italic leading-none whitespace-nowrap skew-x-[10deg]`}>{currentPlayer.name.split(' ')[0]}</h2><h3 className={`${isSquare ? 'text-3xl' : 'text-5xl'} font-bold text-slate-400 uppercase tracking-widest mt-2 skew-x-[10deg]`}>{currentPlayer.position}</h3></div>
                    </div>
                </div>
            )}

            {showSummary && (
                <div className="flex-1 flex items-end justify-center pb-20 gap-4 px-4 z-10 animate-in fade-in duration-500">
                    {players.summary.map((p, i) => (
                        <div key={i} className="relative flex-1 h-[60vh] bg-slate-800 rounded-t-xl overflow-hidden border-t-4 border-yellow-400 shadow-2xl group">
                            {p ? (<><div className="absolute inset-0">{isVideo(p.photo) ? (<video src={resolveUrl(p.photo)} className="w-full h-full object-cover opacity-80" autoPlay muted playsInline />) : (<img src={resolveUrl(p.photo)} className="w-full h-full object-cover opacity-80" />)}<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div></div><div className="absolute bottom-0 w-full p-2 text-center"><div className="text-6xl font-black text-white/10 absolute top-2 right-2">{p.number}</div><div className="relative z-10"><div className="text-xl font-black uppercase text-yellow-400 drop-shadow-md truncate">{p.name.split(' ')[0]}</div><div className="text-xs font-bold text-white uppercase bg-black/50 inline-block px-2 rounded mt-1">{p.position}</div></div></div></>) : (<div className="flex items-center justify-center h-full text-slate-600 font-bold">EMPTY</div>)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}