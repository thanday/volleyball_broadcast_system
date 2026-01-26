import React, { useState, useEffect } from 'react';
import { 
    ArrowLeftRight, Wifi, WifiOff, Link as LinkIcon, Copy, Monitor, 
    Repeat, DollarSign, Tv, Maximize2, Upload, Trash2, CheckCircle, 
    Minus, Plus, User, Users, UserCheck, Play, Settings, RotateCcw, SkipForward,
    Trophy, ListOrdered, XCircle, Square, RectangleHorizontal
} from 'lucide-react';

import { useVolleyballData } from '../context/VolleyballContext'; 

export default function ControlPanel({ matchId, onBack }) {
    const { matches, setMatches, teams, referees, status, serverUrl, setServerUrl } = useVolleyballData();
    const [tab, setTab] = useState('score');
    const [localIp, setLocalIp] = useState(serverUrl || 'http://localhost:3001');

    const handleServerChange = (e) => setLocalIp(e.target.value);
    const applyServerChange = () => { if (localIp !== serverUrl) setServerUrl(localIp); };

    const matchList = Array.isArray(matches) ? matches : [];
    const idx = matchList.findIndex(m => m.id === matchId);
    const match = matchList[idx];

    const updateMatch = (data) => {
        if (idx === -1) return;
        const copy = [...matchList];
        copy[idx] = { ...copy[idx], ...data };
        setMatches(copy);
    };

    // Auto-revert Substitution View
    useEffect(() => {
        if (match?.activeView === 'substitution') {
            const timer = setTimeout(() => {
                updateMatch({ activeView: 'scoreboard' });
            }, 11000);
            return () => clearTimeout(timer);
        }
    }, [match?.activeView]);

    // FIXED TIMEOUT LOGIC
    useEffect(() => {
        if (!match) return;
        
        const timer = setInterval(() => {
            const now = Date.now();
            let updates = {};
            let needsUpdate = false;

            // Check A
            if (match.teamA?.activeTimeout && match.teamA?.timeoutExpires && now > match.teamA.timeoutExpires) {
                updates.teamA = { ...match.teamA, activeTimeout: false, timeoutExpires: null };
                needsUpdate = true;
            }
            // Check B
            if (match.teamB?.activeTimeout && match.teamB?.timeoutExpires && now > match.teamB.timeoutExpires) {
                updates.teamB = { ...match.teamB, activeTimeout: false, timeoutExpires: null };
                needsUpdate = true;
            }

            if (needsUpdate) {
                updateMatch(updates);
            }
        }, 500); 

        return () => clearInterval(timer);
    }, [match]);

    // Data Helpers
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

    const handleTimeout = (teamField, delta) => {
        const teamData = match[teamField];
        const val = Math.max(0, (teamData.timeouts || 0) + delta);
        let updates = { timeouts: val };
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

    // END MATCH FUNCTION
    const endMatch = () => {
        if (confirm("Are you sure you want to END this match? It will be moved to History.")) {
            updateMatch({ status: 'Finished' });
            onBack(); // Go back to dashboard immediately
        }
    };

    const toggleView = (viewName) => {
        if (match.activeView === viewName && match.graphicsVisible) {
            updateMatch({ graphicsVisible: false });
        } else {
            if (viewName === 'scoreboard') {
                updateMatch({ activeView: viewName, graphicsVisible: true, subData: { ...match.subData, visible: false } });
            } else {
                updateMatch({ activeView: viewName, graphicsVisible: true });
            }
        }
    };

    const copyLink = (type) => {
        const host = window.location.hostname;
        const port = window.location.port;
        const baseUrl = `${window.location.protocol}//${host}:${port}${window.location.pathname}`;
        
        let viewParam = type;
        if(type === 'scorebar') viewParam = 'scorebar';
        if(type === 'stadium') viewParam = 'stadium';

        const url = `${baseUrl}?view=${viewParam}&matchId=${matchId}&server=${encodeURIComponent(localIp)}`;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url);
        } else {
            const ta = document.createElement("textarea");
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        alert(`${type.toUpperCase()} Link Copied!\nServer: ${localIp}`);
    };

    const isScoreboardActive = (match.activeView === 'scoreboard' || match.activeView === 'substitution') && match.graphicsVisible;

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            {/* HEADER */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full"><ArrowLeftRight /></button>
                    <div>
                        <h2 className="font-bold">{match.leagueName}</h2>
                        <div className="text-xs text-slate-400">{match.teamA.name} vs {match.teamB.name}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={endMatch} className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded flex items-center gap-2 border border-red-400 shadow-md transition-all active:scale-95">
                        <XCircle size={14} /> END MATCH
                    </button>

                    <div className="h-6 w-px bg-slate-600 mx-2"></div>

                    <button onClick={() => copyLink('scorebar')} className="text-xs bg-purple-600 text-white font-bold px-3 py-2 rounded flex items-center gap-2 hover:bg-purple-700 border border-purple-400 shadow-md transition-all active:scale-95"><LinkIcon size={14} /> OVERLAY</button>
                    
                    <div className="flex flex-col items-end">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Server URL</label>
                        <input className="text-xs font-mono border-none p-1 rounded bg-slate-700 text-white w-40 focus:ring-1 focus:ring-blue-500 outline-none" value={localIp} onChange={handleServerChange} onBlur={applyServerChange} />
                    </div>

                    <div className={`text-xs px-2 py-1 rounded flex gap-1 items-center ${status === 'connected' ? 'text-green-400 bg-green-900/30' : 'text-[#2F36CF] bg-indigo-900/30'}`}>{status === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />} {status.toUpperCase()}</div>
                    
                    <button onClick={() => updateMatch({ serveVisible: !match.serveVisible })} className={`text-xs px-4 py-2 rounded font-bold ${match.serveVisible ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-400'}`}>Serve: {match.serveVisible ? 'ON' : 'OFF'}</button>
                    
                    <button onClick={() => updateMatch({ graphicsVisible: !match.graphicsVisible })} className={`text-xs px-4 py-2 rounded font-bold ${match.graphicsVisible ? 'bg-green-500' : 'bg-red-500'}`}>{match.graphicsVisible ? 'GFX ON' : 'GFX OFF'}</button>
                    
                    <button onClick={() => window.open(`${window.location.origin}${window.location.pathname}?view=output&matchId=${matchId}&server=${encodeURIComponent(localIp)}`, '_blank')} className="text-xs bg-slate-700 px-3 py-2 rounded">Output</button>
                </div>
            </div>

            {/* TABS */}
            <div className="p-4 flex gap-4">
                <button onClick={() => setTab('score')} className={`px-4 py-2 rounded font-bold ${tab === 'score' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Scoring</button>
                <button onClick={() => setTab('gfx')} className={`px-4 py-2 rounded font-bold ${tab === 'gfx' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Graphics & Links</button>
                <button onClick={() => setTab('lineup')} className={`px-4 py-2 rounded font-bold ${tab === 'lineup' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Lineup</button>
                <button onClick={() => setTab('subs')} className={`px-4 py-2 rounded font-bold ${tab === 'subs' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Substitution</button>
                <button onClick={() => setTab('sponsors')} className={`px-4 py-2 rounded font-bold ${tab === 'sponsors' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Sponsors</button>
            </div>

            <div className="flex-1 overflow-hidden flex gap-4 p-4 pt-0">
                {/* TAB: SCORE */}
                {tab === 'score' && (
                    <>
                        <div className="w-64 bg-white rounded-xl border flex flex-col overflow-hidden shadow-sm">
                            <div className="p-3 bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b text-center border-t-4" style={{ borderColor: left.color }}>{left.name}<br /><span className="text-[10px] opacity-70">Active Player Overlay</span></div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">{(left.roster || []).map(p => (<button key={p.id} onClick={() => updateMatch({ activePlayerId: match.activePlayerId === p.id ? null : p.id })} className={`w-full text-left p-2 rounded flex items-center gap-2 transition-all ${match.activePlayerId === p.id ? 'bg-yellow-100 border border-yellow-400 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}><span className="font-mono font-bold text-slate-500 w-6 bg-white rounded text-center border">{p.number}</span><span className="truncate flex-1 text-xs font-bold text-slate-700">{p.name}</span></button>))}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <TeamController name={left.name} data={match[leftId]} serving={match.serving === (match.isSwapped ? 'B' : 'A')} onScore={d => handleScore(leftId, d)} onSet={d => updateMatch({ [leftId]: { ...match[leftId], sets: Math.max(0, match[leftId].sets + d) } })} onColor={c => updateMatch({ [leftId]: { ...match[leftId], color: c } })} onTimeout={d => handleTimeout(leftId, d)} onServe={() => updateMatch({ serving: leftId === 'teamA' ? 'A' : 'B' })} onAlert={() => updateMatch({ [leftId]: { ...match[leftId], activeTimeout: !match[leftId].activeTimeout, timeoutExpires: null } })} />
                                <TeamController name={right.name} data={match[rightId]} serving={match.serving === (match.isSwapped ? 'A' : 'B')} onScore={d => handleScore(rightId, d)} onSet={d => updateMatch({ [rightId]: { ...match[rightId], sets: Math.max(0, match[rightId].sets + d) } })} onColor={c => updateMatch({ [rightId]: { ...match[rightId], color: c } })} onTimeout={d => handleTimeout(rightId, d)} onServe={() => updateMatch({ serving: rightId === 'teamA' ? 'A' : 'B' })} onAlert={() => updateMatch({ [rightId]: { ...match[rightId], activeTimeout: !match[rightId].activeTimeout, timeoutExpires: null } })} />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={finishSet} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"><CheckCircle /> Finish Set</button>
                                <button onClick={() => updateMatch({ isSwapped: !match.isSwapped })} className="px-8 py-4 bg-amber-100 text-amber-900 rounded-xl font-bold flex gap-2 hover:bg-amber-200 active:scale-95 transition-all"><ArrowLeftRight /> Swap</button>
                            </div>
                        </div>
                        <div className="w-64 bg-white rounded-xl border flex flex-col overflow-hidden shadow-sm">
                            <div className="p-3 bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b text-center border-t-4" style={{ borderColor: right.color }}>{right.name}<br /><span className="text-[10px] opacity-70">Active Player Overlay</span></div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">{(right.roster || []).map(p => (<button key={p.id} onClick={() => updateMatch({ activePlayerId: match.activePlayerId === p.id ? null : p.id })} className={`w-full text-left p-2 rounded flex items-center gap-2 transition-all ${match.activePlayerId === p.id ? 'bg-yellow-100 border border-yellow-400 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}><span className="font-mono font-bold text-slate-500 w-6 bg-white rounded text-center border">{p.number}</span><span className="truncate flex-1 text-xs font-bold text-slate-700">{p.name}</span></button>))}</div>
                        </div>
                    </>
                )}

                {/* TAB: GRAPHICS */}
                {tab === 'gfx' && (
                    <div className="flex-1 flex gap-6 overflow-hidden">
                        <div className="w-1/3 space-y-4 overflow-y-auto pr-2 pb-4">
                            {/* --- LED CONTROLS --- */}
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3 flex items-center gap-2"><Maximize2 size={16}/> Stadium LED Mode</h3>
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => updateMatch({ ledAspectRatio: '16:9' })} className={`flex-1 p-2 rounded border-2 font-bold flex flex-col items-center gap-1 transition-all ${match.ledAspectRatio !== '1:1' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><RectangleHorizontal size={24} /><span className="text-xs">16:9 Wide</span></button>
                                    <button onClick={() => updateMatch({ ledAspectRatio: '1:1' })} className={`flex-1 p-2 rounded border-2 font-bold flex flex-col items-center gap-1 transition-all ${match.ledAspectRatio === '1:1' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Square size={24} /><span className="text-xs">1:1 Square</span></button>
                                </div>
                                <button onClick={() => copyLink('stadium')} className="w-full text-left border rounded p-2 bg-slate-800 text-white flex justify-between items-center hover:bg-black transition-all"><div className="text-xs font-mono font-bold flex items-center gap-2"><Tv size={14} /> Copy Stadium Link</div><Copy size={14} /></button>
                            </div>

                            {/* --- MAIN VIEWS --- */}
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3">Main Views</h3>
                                <div className="space-y-2">
                                    <button onClick={() => toggleView('scoreboard')} className={`w-full p-3 rounded font-bold border-2 transition-all ${isScoreboardActive ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Scoreboard {isScoreboardActive ? '(ON)' : ''}</button>
                                    <button onClick={() => toggleView('full_time')} className={`w-full p-3 rounded font-bold border-2 transition-all ${match.activeView === 'full_time' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}>Full Time Result</button>
                                    <button onClick={() => toggleView('match_result')} className={`w-full p-3 rounded font-bold border-2 flex items-center justify-center gap-2 transition-all ${match.activeView === 'match_result' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-transparent bg-slate-50'}`}><Trophy size={16}/> Match/Sets Result</button>
                                    
                                    {/* UPDATED STANDINGS BUTTONS */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => toggleView('standings_A')} className={`p-2 rounded font-bold border-2 text-xs transition-all ${match.activeView === 'standings_A' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Standings Pool A</button>
                                        <button onClick={() => toggleView('standings_B')} className={`p-2 rounded font-bold border-2 text-xs transition-all ${match.activeView === 'standings_B' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Standings Pool B</button>
                                    </div>
                                </div>
                            </div>

                            {/* --- REFEREES --- */}
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold mb-3 flex items-center gap-2"><UserCheck size={16}/> Referees</h3>
                                <div className="space-y-3">
                                    <div><label className="text-xs font-bold text-slate-400">1st Referee</label><select className="w-full border p-2 rounded text-sm" value={match.referee1?.id || ""} onChange={e => { const val = e.target.value; const r = refereeList.find(x => String(x.id) === String(val)); if(r) updateMatch({ referee1: { name: r.name, country: r.country, id: r.id } }); }}><option value="">Select...</option>{refereeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-slate-400">2nd Referee</label><select className="w-full border p-2 rounded text-sm" value={match.referee2?.id || ""} onChange={e => { const val = e.target.value; const r = refereeList.find(x => String(x.id) === String(val)); if(r) updateMatch({ referee2: { name: r.name, country: r.country, id: r.id } }); }}><option value="">Select...</option>{refereeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => toggleView('referee1')} className={`p-2 rounded font-bold border-2 text-xs transition-all ${match.activeView === 'referee1' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Show 1st Ref</button>
                                        <button onClick={() => toggleView('referee2')} className={`p-2 rounded font-bold border-2 text-xs transition-all ${match.activeView === 'referee2' && match.graphicsVisible ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-slate-50'}`}>Show 2nd Ref</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl border p-4 flex flex-col justify-center items-center text-slate-300">
                             <Monitor size={48} className="mb-2"/>
                             <span className="font-bold">Output Preview</span>
                        </div>
                    </div>
                )}

                {/* TAB: LINEUP */}
                {tab === 'lineup' && (
                    <div className="flex-1 bg-white p-6 rounded-xl border shadow-sm overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl flex items-center gap-2"><Users size={24} /> Starting 7 Selection</h3>
                            {/* --- ADDED RESET BUTTON --- */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateMatch({ lineupStep: 0 })} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-2 rounded flex items-center gap-2 border border-slate-300 transition-all"><RotateCcw size={14} /> RESET DISPLAY</button>
                                <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Select exactly 7 players</div>
                            </div>
                        </div>
                        {match.graphicsVisible && (match.activeView === 'lineup_A' || match.activeView === 'lineup_B') && (
                            <div className="mb-6 p-4 bg-slate-900 rounded-xl flex items-center justify-between text-white shadow-lg animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-black uppercase text-yellow-400">{match.activeView === 'lineup_A' ? left.name : right.name} LINEUP IS LIVE</div>
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest bg-white/10 px-3 py-1 rounded">Step: {match.lineupStep === 0 ? "INTRO" : match.lineupStep > 7 ? "SUMMARY" : `PLAYER ${match.lineupStep}`}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => updateMatch({ lineupStep: 0 })} className="p-3 bg-white/10 rounded hover:bg-white/20 text-white" title="Restart Intro"><RotateCcw size={20} /></button>
                                    <button onClick={() => updateMatch({ lineupStep: Math.min((match.lineupStep || 0) + 1, 8) })} className="px-6 py-3 bg-green-600 rounded font-black flex items-center gap-2 hover:bg-green-500 shadow-lg active:scale-95"><Play fill="currentColor" size={16} /> NEXT PLAYER</button>
                                    <button onClick={() => updateMatch({ lineupStep: 8 })} className="px-4 py-3 bg-blue-600 rounded font-bold hover:bg-blue-500 flex items-center gap-2"><SkipForward size={16} /> SUMMARY</button>
                                </div>
                            </div>
                        )}
                        <div className="flex-1 flex gap-8 overflow-hidden">
                            {[left, right].map((team, idx) => {
                                const teamKey = team.id === match.teamA.id ? 'lineupA' : 'lineupB';
                                const viewKey = team.id === match.teamA.id ? 'lineup_A' : 'lineup_B';
                                const currentLineup = match[teamKey] || [];
                                const count = currentLineup.length;
                                const isActive = match.activeView === viewKey && match.graphicsVisible;
                                return (
                                    <div key={team.id} className={`flex-1 flex flex-col bg-slate-50 rounded-xl border overflow-hidden ${isActive ? 'ring-4 ring-green-500 ring-opacity-50' : ''}`}>
                                        <div className="p-3 border-b flex justify-between items-center bg-white"><span className="font-black uppercase text-lg" style={{ color: team.color }}>{team.name}</span><span className={`text-xs font-bold px-2 py-1 rounded ${count === 7 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{count} / 7 Selected</span></div>
                                        <div className="flex-1 overflow-y-auto p-2">{(team.roster || []).map(p => { const isSelected = currentLineup.includes(p.id); return (<div key={p.id} onClick={() => { if (isSelected) { updateMatch({ [teamKey]: currentLineup.filter(id => id !== p.id) }); } else { if (count < 7) updateMatch({ [teamKey]: [...currentLineup, p.id] }); } }} className={`flex items-center justify-between p-2 mb-1 rounded border cursor-pointer select-none transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-slate-100 border-slate-200'}`}><div className="flex items-center gap-3"><span className={`font-mono font-bold w-6 text-center rounded ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>{p.number}</span><span className="font-bold uppercase text-sm">{p.name}</span></div>{isSelected && <CheckCircle size={16} />}</div>) })}</div>
                                        <div className="p-3 border-t bg-white"><button onClick={() => { if (!isActive) updateMatch({ lineupStep: 0 }); toggleView(viewKey); }} className={`w-full py-3 rounded font-bold border-2 transition-all ${isActive ? 'bg-red-600 text-white border-red-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{isActive ? 'HIDE LINEUP' : `SHOW ${team.name} LINEUP`}</button></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: SUBS */}
                {tab === 'subs' && (
                    <div className="flex-1 bg-white p-6 rounded-xl border shadow-sm overflow-y-auto">
                        <h3 className="font-bold text-xl flex items-center gap-2 mb-6"><Repeat size={24} /> Substitution Manager</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <SubController team={left} side="left" match={match} updateMatch={updateMatch} />
                            <SubController team={right} side="right" match={match} updateMatch={updateMatch} />
                        </div>
                    </div>
                )}
                
                {tab === 'sponsors' && (<div className="p-6">Sponsors Module Here</div>)}
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

function SubController({ team, side, match, updateMatch }) {
    if (!team || !team.roster) return null;
    const [selectedIn, setSelectedIn] = useState(null);
    const [selectedOut, setSelectedOut] = useState(null);
    const sortedRoster = [...team.roster].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    
    useEffect(() => {
        if (selectedIn && selectedOut) {
            const pIn = team.roster.find(p => p.id === selectedIn);
            const pOut = team.roster.find(p => p.id === selectedOut);
            updateMatch({ activeView: 'substitution', graphicsVisible: true, subData: { teamId: team.id, inId: pIn.id, outId: pOut.id, visible: true } });
            setTimeout(() => { setSelectedIn(null); setSelectedOut(null); }, 500);
        }
    }, [selectedIn, selectedOut]);

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg border overflow-hidden">
             <div className="p-2 font-black text-center text-white uppercase tracking-widest text-sm" style={{ backgroundColor: team.color }}>{team.name} SUB</div>
             <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 border rounded bg-white">
                    <div className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 flex justify-between items-center"><span>IN</span>{selectedIn && <span className="bg-green-600 text-white px-2 rounded-full">#{team.roster.find(p=>p.id===selectedIn)?.number}</span>}</div>
                    <div className="flex-1 overflow-y-auto p-1"><div className="grid grid-cols-4 gap-1">{sortedRoster.map(p => (<button key={p.id} onClick={() => setSelectedIn(p.id)} disabled={p.id === selectedOut} className={`h-16 flex items-center justify-center rounded border font-black text-4xl transition-all ${selectedIn === p.id ? 'bg-green-600 text-white border-green-800 scale-105 shadow-md' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-green-400 hover:bg-green-50'} ${p.id === selectedOut ? 'opacity-20' : ''}`}>{p.number}</button>))}</div></div>
                </div>
                <div className="flex-1 flex flex-col min-h-0 border rounded bg-white">
                    <div className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-1 flex justify-between items-center"><span>OUT</span>{selectedOut && <span className="bg-red-600 text-white px-2 rounded-full">#{team.roster.find(p=>p.id===selectedOut)?.number}</span>}</div>
                    <div className="flex-1 overflow-y-auto p-1"><div className="grid grid-cols-4 gap-1">{sortedRoster.map(p => (<button key={p.id} onClick={() => setSelectedOut(p.id)} disabled={p.id === selectedIn} className={`h-16 flex items-center justify-center rounded border font-black text-4xl transition-all ${selectedOut === p.id ? 'bg-red-600 text-white border-red-800 scale-105 shadow-md' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50'} ${p.id === selectedIn ? 'opacity-20' : ''}`}>{p.number}</button>))}</div></div>
                </div>
             </div>
        </div>
    )
}