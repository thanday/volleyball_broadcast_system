import React, { useState, useEffect } from 'react';
import { Flag, User } from 'lucide-react';
import { useVolleyballData } from '../context/VolleyballContext';

// --- HELPER: Text Color based on background ---
const getTextColor = (hex) => {
    if (!hex) return '#ffffff';
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#0f172a' : '#ffffff';
};

export default function CavaNationsOverlay({ matchId }) {
    const { matches, teams } = useVolleyballData();
    const matchList = Array.isArray(matches) ? matches : [];
    const teamList = Array.isArray(teams) ? teams : [];
    const match = matchList.find(m => m.id === matchId);
    
    const [introMode, setIntroMode] = useState(true);
    const [sponsorIdx, setSponsorIdx] = useState(0);

    // --- DATA HELPERS ---
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

    const serverUrl = window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
    const resolveUrl = (url) => {
        if (!url) return "";
        if (url.startsWith('data:') || url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${serverUrl}${url}`;
        return `/${url}`;
    };

    // --- STANDINGS CALCULATION ---
    const calculateStandings = () => {
        const stats = {};
        teamList.forEach(t => {
            stats[t.id] = { ...t, played: 0, won: 0, lost: 0, points: 0, setsWon: 0, setsLost: 0 };
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

    // --- EFFECTS ---
    useEffect(() => {
        if (match?.activeView === 'scoreboard' && match?.graphicsVisible) {
            setIntroMode(true);
            const timer = setTimeout(() => setIntroMode(false), 4000);
            return () => clearTimeout(timer);
        } else {
            setIntroMode(false);
        }
    }, [match?.activeView, match?.graphicsVisible]);

    useEffect(() => {
        if (match?.showBroadcastSponsors && (match?.broadcastSponsors?.length || 0) > 1) {
            const interval = setInterval(() => {
                setSponsorIdx(prev => (prev + 1) % match.broadcastSponsors.length);
            }, 5000);
            return () => clearInterval(interval);
        } else {
            setSponsorIdx(0);
        }
    }, [match?.broadcastSponsors, match?.showBroadcastSponsors]);

    if (!match) return <div className="text-white p-10">Waiting for data...</div>;

    const left = match.isSwapped ? getLatestTeamData(match.teamB) : getLatestTeamData(match.teamA);
    const right = match.isSwapped ? getLatestTeamData(match.teamA) : getLatestTeamData(match.teamB);
    const show = match.graphicsVisible;
    const sL = match.serveVisible && match.serving === (match.isSwapped ? 'B' : 'A');
    const sR = match.serveVisible && match.serving === (match.isSwapped ? 'A' : 'B');

    // Referees
    const currentRef = (match.activeReferee || 1) === 1 ? match.referee1 : match.referee2;
    const refTitle = (match.activeReferee || 1) === 1 ? "1ST REFEREE" : "2ND REFEREE";

    // Summary Helpers
    const history = match.setHistory || [];
    const getSetScore = (teamSide, setIndex) => {
        const set = history.find(h => h.set === setIndex);
        if (!set) return "";
        const isTeamA = teamSide.id === match.teamA.id;
        return isTeamA ? set.scoreA : set.scoreB;
    };
    const getSetResult = (teamSide, setIndex) => {
        const set = history.find(h => h.set === setIndex);
        if (!set) return { score: "-", isWinner: false };
        const isTeamA = teamSide.id === match.teamA.id;
        const myScore = isTeamA ? set.scoreA : set.scoreB;
        const otherScore = isTeamA ? set.scoreB : set.scoreA;
        return { score: myScore, isWinner: myScore > otherScore };
    };

    // Point State (Set Point / Match Point)
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
    
    const getTopLabel = (isTimeout, status) => {
        if (isTimeout) return { text: "TIMEOUT", className: "animate-flash-timeout bg-[#dc2626]" };
        if (status) return { text: status, className: "bg-[#2F36CF]" };
        return null;
    };
    const topLabelL = getTopLabel(left.activeTimeout, statusL);
    const topLabelR = getTopLabel(right.activeTimeout, statusR);

    // Active Player Logic
    const allPlayers = [...(left.roster || []), ...(right.roster || [])];
    const activeP = allPlayers.find(p => p.id === match.activePlayerId);
    const isLeftPlayer = left.roster?.some(p => p.id === match.activePlayerId);
    const isRightPlayer = right.roster?.some(p => p.id === match.activePlayerId);
    const isFullTime = match.activeView === 'full_time';

    return (
        <div className="w-[1920px] h-[1080px] relative overflow-hidden font-sans bg-transparent">
            
            {/* 1. STANDINGS VIEW */}
            {show && match.activeView === 'standings' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                     <div className="flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.6)] border-2 border-white/20 rounded-xl overflow-hidden bg-slate-900/95 backdrop-blur-xl w-[1000px] animate-in slide-in-from-bottom-12 zoom-in-95 fade-in duration-700 ease-out">
                        <div className="bg-[#2F36CF] w-full h-24 flex justify-between items-center px-6 border-b border-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                            <div className="flex items-center gap-6 z-10">
                                <img src="/img/ledlogo.png" className="h-16 w-auto object-contain drop-shadow-md" onError={(e) => e.target.style.display = 'none'} />
                                <h2 className="text-4xl font-black text-white uppercase italic tracking-wider drop-shadow-md">STANDINGS</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 bg-white text-[#2F36CF] text-xl font-black uppercase tracking-wider py-4 border-b border-slate-200">
                            <div className="col-span-1 text-center">Pos</div>
                            <div className="col-span-5 pl-8">Team</div>
                            <div className="col-span-1 text-center">P</div>
                            <div className="col-span-1 text-center">W</div>
                            <div className="col-span-1 text-center">L</div>
                            <div className="col-span-3 text-center pr-6">Points</div>
                        </div>
                        <div className="flex flex-col">
                            {standings.map((t, i) => {
                                const isTopTwo = i < 2; // Fixed logic for top 2
                                return (
                                    <div key={t.id} className={`grid grid-cols-12 items-center py-4 border-b border-white/5 text-white transition-all duration-500 relative overflow-hidden ${isTopTwo ? 'bg-gradient-to-r from-yellow-500/20 to-transparent' : 'even:bg-white/5'}`}>
                                        {isTopTwo && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-600 shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>}
                                        <div className="col-span-1 flex justify-center">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl shadow-lg border border-white/20 ${isTopTwo ? 'bg-orange-600 text-black scale-110' : 'bg-[#2F36CF] text-white'}`}>{i + 1}</div>
                                        </div>
                                        <div className="col-span-5 pl-8 flex items-center gap-4">
                                            {t.flag && <img src={resolveUrl(t.flag)} className="w-12 h-8 object-cover rounded shadow-md border border-white/10" />}
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

            {/* 2. MATCH SUMMARY VIEW */}
            {show && match.activeView === 'summary' && (
                <div className="absolute top-10 left-10 z-50 animate-in slide-in-from-left-4 fade-in duration-500">
                    <div className="flex flex-col shadow-2xl border-2 border-white/20 rounded-xl overflow-hidden bg-slate-900/90 backdrop-blur">
                        <div className="bg-[#2F36CF] w-full h-16 flex justify-start items-center border-b border-white/10">
                            <img src="/img/ledlogo.png" className="h-full w-auto object-contain" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                        <div className="flex bg-slate-800 border-b border-white/10 text-xs font-bold text-slate-400">
                            <div className="w-[180px] p-2 pl-4">TEAMS</div>
                            <div className="w-16 flex items-center justify-center border-l border-white/10">TOTAL</div>
                            {[1, 2, 3, 4, 5].map(i => (<div key={i} className="w-16 flex items-center justify-center border-l border-white/10">SET {i}</div>))}
                        </div>
                        {/* LEFT TEAM ROW */}
                        <div className="flex h-16 border-b border-white/10 bg-white">
                             <div style={{ backgroundColor: left.color }} className="w-[180px] flex items-center justify-between px-4 relative overflow-hidden">
                                <span className="text-2xl font-black text-white uppercase relative z-10 drop-shadow-md truncate" style={{ color: getTextColor(left.color) }}>{left.country}</span>
                                {left.flag && <img src={resolveUrl(left.flag)} className="h-8 w-12 object-cover border border-white/20 shadow-sm z-10 ml-2" />}
                             </div>
                             <div className="w-16 bg-[#2F36CF] flex items-center justify-center text-white border-x border-slate-200"><span className="text-4xl font-black leading-none">{left.sets}</span></div>
                             {[1, 2, 3, 4, 5].map(i => {
                                 const result = getSetResult(left, i);
                                 return <div key={i} className={`w-16 flex items-center justify-center border-r border-slate-200 last:border-0 bg-white`}><span className={`text-2xl font-bold ${result.isWinner ? 'text-black font-black' : 'text-slate-400'}`}>{result.score}</span></div>
                             })}
                        </div>
                        {/* RIGHT TEAM ROW */}
                        <div className="flex h-16 bg-white">
                             <div style={{ backgroundColor: right.color }} className="w-[180px] flex items-center justify-between px-4 relative overflow-hidden">
                                <span className="text-2xl font-black text-white uppercase relative z-10 drop-shadow-md truncate" style={{ color: getTextColor(right.color) }}>{right.country}</span>
                                {right.flag && <img src={resolveUrl(right.flag)} className="h-8 w-12 object-cover border border-white/20 shadow-sm z-10 ml-2" />}
                             </div>
                             <div className="w-16 bg-[#2F36CF] flex items-center justify-center text-white border-x border-slate-200"><span className="text-4xl font-black leading-none">{right.sets}</span></div>
                             {[1, 2, 3, 4, 5].map(i => {
                                 const result = getSetResult(right, i);
                                 return <div key={i} className={`w-16 flex items-center justify-center border-r border-slate-200 last:border-0 bg-white`}><span className={`text-2xl font-bold ${result.isWinner ? 'text-black font-black' : 'text-slate-400'}`}>{result.score}</span></div>
                             })}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. REFEREE LOWER THIRD */}
            <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-700 z-50 ${show && match.activeView === 'referees' ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0'}`}>
                <div className="flex items-center shadow-2xl">
                    <div className="w-[200px] h-24 bg-[#2F36CF] text-white flex items-center justify-center border-r-2 border-black/10"><span className="font-black text-xl uppercase tracking-wider">{refTitle}</span></div>
                    <div className="w-[600px] h-24 bg-white flex flex-col items-start justify-center px-8 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                        <div key={match.activeReferee || 1} className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div className="text-4xl font-black text-slate-900 uppercase leading-none mb-1">{currentRef?.name || "Official"}</div>
                            <div className="text-lg font-bold text-slate-500 uppercase tracking-widest">{currentRef?.country || ""}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. MAIN SCOREBOARD & PLAYER OVERLAYS */}
            <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-700 z-40 ${show && (match.activeView === 'scoreboard' || match.activeView === 'full_time') ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0'}`}>
                <div className="relative flex items-center">
                    
                    {/* SUBSTITUTION OVERLAY */}
                    {(() => {
                        const s = match.subData || {};
                        const isVisible = s.visible && !introMode && match.activeView === 'scoreboard';
                        const pIn = s.teamId === left.id ? left.roster?.find(p => p.id === s.inId) : right.roster?.find(p => p.id === s.inId);
                        const pOut = s.teamId === left.id ? left.roster?.find(p => p.id === s.outId) : right.roster?.find(p => p.id === s.outId);
                        const isLeft = s.teamId === left.id;

                        if (isVisible && pIn && pOut) {
                            return (
                                <div className={`absolute bottom-full mb-0 transition-all duration-500 ease-out z-[110] overflow-hidden w-[396px] h-32 opacity-100 shadow-xl ${isLeft ? 'left-0' : 'right-0'}`}>
                                    <div className="w-full h-full flex flex-col">
                                        <div className={`flex-1 bg-green-700 text-white flex items-center px-4 relative border-${isLeft ? 'r' : 'l'}-4 border-white/20 ${!isLeft ? 'flex-row-reverse text-right' : ''}`}>
                                            <span className="text-4xl font-black mx-4">{pIn.number}</span>
                                            <div className="flex flex-col"><span className="text-lg font-bold uppercase leading-none truncate">{pIn.name}</span><span className="text-[10px] font-bold uppercase tracking-widest opacity-80">SUB IN</span></div>
                                        </div>
                                        <div className={`flex-1 bg-red-800 text-white flex items-center px-4 relative border-${isLeft ? 'r' : 'l'}-4 border-white/20 ${!isLeft ? 'flex-row-reverse text-right' : ''}`}>
                                            <span className="text-4xl font-black mx-4 text-white/70">{pOut.number}</span>
                                            <div className="flex flex-col"><span className="text-lg font-bold uppercase leading-none truncate text-white/90">{pOut.name}</span><span className="text-[10px] font-bold uppercase tracking-widest opacity-60">SUB OUT</span></div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    })()}

                    {/* ACTIVE PLAYER OVERLAY (LEFT) */}
                    <div className={`absolute left-0 bottom-full h-24 flex items-center mb-0 transition-all duration-700 ease-in-out z-[100] overflow-hidden ${isLeftPlayer && !isFullTime ? 'w-[396px] opacity-100' : 'w-0 opacity-0'}`}>
                         {activeP && isLeftPlayer && (
                            <div className="w-[396px] h-24 bg-[#2F36CF] text-white flex items-center relative px-6 border-r-2 border-white/10 shadow-xl">
                                <div className="flex-1 flex items-center justify-between gap-4">
                                    <span className="text-5xl font-black text-white">{activeP.number}</span>
                                    <div className="text-right overflow-hidden"><div className="text-xl font-bold uppercase leading-tight whitespace-nowrap truncate">{activeP.name}</div><div className="text-sm text-white/70 font-bold uppercase tracking-widest">{activeP.position}</div></div>
                                </div>
                            </div>
                         )}
                    </div>

                    {/* LEFT TEAM BAR */}
                    <div className="flex items-center z-10 relative">
                        {/* Top Label (Timeout/Match Point) */}
                        {topLabelL && !introMode && !isLeftPlayer && !isFullTime && (
                            <div className={`absolute -top-8 left-0 h-8 flex items-center justify-center text-white text-sm font-black tracking-wider uppercase z-30 transition-all duration-300 w-[396px] shadow-lg ${topLabelL.className}`}>{topLabelL.text}</div>
                        )}
                        {/* Name Bar */}
                        <div style={{ backgroundColor: left.color, width: isFullTime ? '550px' : (introMode ? '600px' : '300px') }} className="h-24 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center relative z-0 shadow-lg overflow-hidden">
                             <span className="font-black uppercase whitespace-nowrap transition-all duration-500 text-5xl" style={{ color: getTextColor(left.color) }}>{(introMode || isFullTime) ? left.name : (left.country || left.name.substring(0, 3))}</span>
                             <div className={`absolute left-0 top-0 bottom-0 w-full overflow-hidden flex items-center justify-center transition-opacity duration-500 ${(introMode || isFullTime) ? 'opacity-20' : 'opacity-0'}`}>{left.flag && <img src={resolveUrl(left.flag)} className="w-full h-full object-cover" />}</div>
                             <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>
                        </div>
                        {/* Sets Box */}
                        <div className={`h-24 bg-[#f05c22] text-white flex flex-col items-center justify-center border-r-2 border-black/10 z-10 overflow-hidden transition-all duration-1000 ${introMode ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
                             <span className="text-[30px] font-bold uppercase leading-none mt-1 text-white/70">SETS</span><span className="text-5xl font-black leading-none">{left.sets}</span><div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
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
                        <div className="flex items-center justify-center w-full h-full relative z-20 bg-[#2F36CF]"><img src={match.tournamentLogo || "/img/logo.png"} className="h-20 w-20 object-contain" onError={(e) => e.target.style.display = 'none'} /></div>
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>
                        {/* SPONSOR BAR */}
                        {match.showBroadcastSponsors && match.broadcastSponsors && match.broadcastSponsors.length > 0 && (
                            <div className="absolute top-24 h-10 w-[140px] -ml-[2px] bg-white flex items-center justify-center shadow-xl border-x-2 border-b-2 border-white/10 rounded-b-2xl animate-in slide-in-from-top-6 -z-10 flex flex-col justify-end pb-1">
                                {match.broadcastSponsors.length === 1 ? (<img src={match.broadcastSponsors[0]} className="h-10 w-32 object-contain" />) : (<img key={sponsorIdx} src={match.broadcastSponsors[sponsorIdx]} className="h-10 w-32 object-contain animate-fade-cycle" />)}
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE GROUP */}
                    <div className="flex items-center z-10 flex-row-reverse relative">
                        {topLabelR && !introMode && !isRightPlayer && !isFullTime && (
                            <div className={`absolute -top-8 right-0 h-8 flex items-center justify-center text-white text-sm font-black tracking-wider uppercase z-30 transition-all duration-300 w-[396px] shadow-lg ${topLabelR.className}`}>{topLabelR.text}</div>
                        )}
                        <div style={{ backgroundColor: right.color, width: isFullTime ? '550px' : (introMode ? '600px' : '300px') }} className="h-24 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center relative z-0 shadow-lg overflow-hidden">
                             <span className="font-black uppercase whitespace-nowrap transition-all duration-500 text-5xl" style={{ color: getTextColor(right.color) }}>{(introMode || isFullTime) ? right.name : (right.country || right.name.substring(0, 3))}</span>
                             <div className={`absolute left-0 top-0 bottom-0 w-full overflow-hidden flex items-center justify-center transition-opacity duration-500 ${(introMode || isFullTime) ? 'opacity-20' : 'opacity-0'}`}>{right.flag && <img src={resolveUrl(right.flag)} className="w-full h-full object-cover" />}</div>
                             <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF] z-30"></div>
                        </div>
                        <div className={`h-24 bg-[#f05c22] text-white flex flex-col items-center justify-center border-l-2 border-black/10 z-10 overflow-hidden transition-all duration-1000 ${introMode ? 'w-0 opacity-0' : 'w-24 opacity-100'}`}>
                             <span className="text-[30px] font-bold uppercase leading-none mt-1 text-white/70">SETS</span><span className="text-5xl font-black leading-none">{right.sets}</span><div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                        </div>
                        <div className={`h-24 bg-white text-slate-900 flex items-center justify-center z-20 overflow-hidden transition-all duration-1000 relative ${introMode || isFullTime ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}>
                             <span key={right.score} className="text-6xl font-black animate-score-pop">{right.score}</span>
                             <div className="absolute top-1 right-2 flex gap-1">{[...Array(right.timeouts)].map((_, i) => <div key={i} className="w-2 h-2 bg-red-500 rounded-full" />)}</div>
                             {sR && <img src="/img/volleyball.png" className="w-5 absolute left-1 top-1 animate-spin-slow" />}
                             <div className="absolute bottom-0 left-0 w-full h-2 bg-[#2F36CF]"></div>
                        </div>
                    </div>

                    {/* ACTIVE PLAYER OVERLAY (RIGHT) */}
                    <div className={`absolute right-0 bottom-full h-24 flex items-center mb-0 transition-all duration-700 ease-in-out z-[100] overflow-hidden ${isRightPlayer && !isFullTime ? 'w-[396px] opacity-100' : 'w-0 opacity-0'}`}>
                         {activeP && isRightPlayer && (
                            <div className="w-[396px] h-24 bg-[#2F36CF] text-white flex items-center relative px-6 border-l-2 border-white/10 flex-row-reverse shadow-xl">
                                <div className="flex-1 flex items-center justify-between flex-row-reverse gap-4">
                                    <span className="text-5xl font-black text-white">{activeP.number}</span>
                                    <div className="text-left overflow-hidden"><div className="text-xl font-bold uppercase leading-tight whitespace-nowrap truncate">{activeP.name}</div><div className="text-sm text-white/70 font-bold uppercase tracking-widest">{activeP.position}</div></div>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* 5. LINEUP DISPLAY */}
            {show && (match.activeView === 'lineup_A' || match.activeView === 'lineup_B') && (
                 <LineupDisplay team={match.activeView === 'lineup_A' ? left : right} ids={match.activeView === 'lineup_A' ? match.lineupA : match.lineupB} step={match.lineupStep} resolveUrl={resolveUrl} getTextColor={getTextColor} />
            )}
        </div>
    );
}

// --- SUB COMPONENTS FOR OVERLAY ---
function LineupDisplay({ team, ids, step, resolveUrl, getTextColor }) {
    if (!team || !ids) return null;
    const isVideo = (url) => url && (url.match(/\.(mov|mp4|webm)$/i) || url.includes('/uploads/') || url.startsWith('data:video/'));
    const lineup = (ids || []).map(id => team.roster?.find(p => p.id === id)).filter(Boolean);
    const showIntro = step === 0;
    const showSummary = step > lineup.length;
    const currentIdx = (step || 0) - 1;
    const featuredPlayer = (!showIntro && !showSummary && lineup[currentIdx]) ? lineup[currentIdx] : null;
    const historyPlayers = showSummary ? lineup : lineup.slice(0, currentIdx);
    const heroTextColor = getTextColor(team.color || '#333');

    return (
        <div className="absolute inset-0 z-[100] overflow-hidden font-sans text-white pointer-events-none">
            <div className={`absolute inset-0 transition-opacity duration-1000 ${showSummary ? 'bg-slate-900/90' : 'bg-transparent'}`}></div>
            <div className="absolute top-10 left-10 flex items-center gap-6 z-50 animate-in slide-in-from-top duration-700">
                <div className="w-28 h-16 bg-white shadow-2xl relative overflow-hidden flex items-center justify-center border-2 border-white/20">{team.flag ? <img src={resolveUrl(team.flag)} className="w-full h-full object-cover" /> : <Flag className="text-slate-300" />}</div>
                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-white">STARTING LINEUP</h1>
            </div>
            {/* Background Text */}
            <div className="absolute left-10 top-28 z-40 pointer-events-none text-7xl font-black uppercase leading-none" style={{ color: team.color || 'white' }}>
                {team.name.split('').map((char, i) => (<span key={i} className="absolute inline-block drop-shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{ left: showSummary ? `${i * 0.85}em` : '0em', top: showSummary ? '0em' : `${i * 0.9}em`, transitionDelay: `${i * 50}ms`, textShadow: '6px 6px 0px rgba(0,0,0,0.5)', width: '1.1em', textAlign: 'center' }}>{char}</span>))}
            </div>
            {/* Featured Player */}
            {!showIntro && !showSummary && featuredPlayer && (
                <div className="absolute inset-0 flex"><div className="w-[40%] h-full relative"><div key={featuredPlayer.id} className="absolute inset-0 animate-slide-in-left"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[500px] font-black text-white/20 select-none leading-none z-0">{featuredPlayer.number}</div><div className="absolute bottom-60 left-52 z-20 flex flex-col items-center"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[900px] flex items-end justify-center -z-10">{isVideo(featuredPlayer.photo) ? (<video src={resolveUrl(featuredPlayer.photo)} autoPlay muted playsInline className="h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ backgroundColor: 'transparent' }} />) : featuredPlayer.photo ? (<img src={resolveUrl(featuredPlayer.photo)} className="h-full object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]" />) : (<User className="h-1/2 w-1/2 text-white/10" />)}</div><div className="transform -skew-x-12 inline-block px-6 py-3 shadow-xl border-l-4 border-white/20 relative" style={{ backgroundColor: team.color || '#333', minWidth: '300px' }}><div className="transform skew-x-12 text-center" style={{ color: heroTextColor }}><div className="font-bold uppercase tracking-widest text-xs mb-1 opacity-80">{featuredPlayer.position}</div><div className="flex items-end justify-center gap-3"><span className="text-6xl font-black leading-none">#{featuredPlayer.number}</span><span className="text-4xl font-black uppercase italic leading-none whitespace-nowrap">{featuredPlayer.name}</span></div></div></div></div></div></div></div>
            )}
            {/* Summary List */}
            {showSummary && (
                <div className="absolute inset-0 flex items-end justify-center px-10 pb-60 pt-64 animate-scale-in"><div className="w-full h-full grid grid-cols-6 gap-4">{historyPlayers.map((p) => (<div key={p.id} className="relative bg-slate-900/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl group flex flex-col h-full"><div className="absolute inset-0 z-0 flex items-end justify-center"><div className="absolute bottom-0 w-full h-3/4 opacity-60" style={{ background: `radial-gradient(circle at bottom, ${team.color || '#ea580c'} 0%, transparent 70%)` }}></div>{isVideo(p.photo) ? (<video src={resolveUrl(p.photo)} autoPlay muted playsInline className="h-[95%] w-full object-contain object-bottom drop-shadow-lg" style={{ backgroundColor: 'transparent' }} />) : p.photo ? (<img src={resolveUrl(p.photo)} className="h-[95%] w-full object-contain object-bottom drop-shadow-lg" />) : <div className="h-full w-full flex items-center justify-center bg-white/5"><User className="h-20 w-20 text-white/20" /></div>}</div><div className="absolute top-0 right-0 p-2 text-6xl font-black text-white/10 leading-none z-10">{p.number}</div><div className="absolute bottom-0 left-0 w-full p-4 pt-12 z-20" style={{ background: `linear-gradient(to top, ${team.color || '#ea580c'} 0%, ${team.color || '#ea580c'}E6 70%, transparent 100%)` }}><div className="flex items-center gap-2 mb-1"><div className="bg-black/50 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase">{p.position}</div><div className="text-white font-black text-xl">#{p.number}</div></div><div className="text-xl font-bold text-white uppercase leading-none truncate" style={{ color: heroTextColor }}>{p.name}</div></div></div>))}</div></div>
            )}
        </div>
    );
}