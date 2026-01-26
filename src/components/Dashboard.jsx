import React, { useState } from 'react';
import { 
    Activity, Server as ServerIcon, Settings, UserCheck, Users, Plus, 
    Share2, Monitor, Tv, Maximize2, Trash2, Copy, Wifi, WifiOff, Upload,
    AlertTriangle, X, User, Link as LinkIcon 
} from 'lucide-react';
import { useVolleyballData } from '../context/VolleyballContext';

export default function Dashboard({ onControl, onOutput, onStadium, onManageTeams, onManageReferees }) {
    const { matches, setMatches, teams, setTeams, referees, setReferees, status, serverUrl, setServerUrl } = useVolleyballData();

    const [isCreating, setIsCreating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [tab, setTab] = useState('upcoming');
    const [form, setForm] = useState({ date: '', time: '', league: "WOMEN'S CAVA CUP", teamA: '', teamB: '' });

    // Local Server IP State for Input Box
    const [localIp, setLocalIp] = useState(serverUrl);

    const handleServerChange = (e) => {
        setLocalIp(e.target.value);
    };

    const applyServerChange = () => {
        if (localIp !== serverUrl) {
            setServerUrl(localIp);
            window.localStorage.setItem('volleyball_server_url', localIp);
            alert(`Connecting to ${localIp}...`);
        }
    };

    const matchList = Array.isArray(matches) ? matches : [];
    const teamList = Array.isArray(teams) ? teams : [];

    const createMatch = (e) => {
        e.preventDefault();
        const tA = teamList.find(t => t.id === form.teamA);
        const tB = teamList.find(t => t.id === form.teamB);

        if (!tA || !tB) {
            alert("Please select both HOME and AWAY teams.");
            return;
        }

        const newMatch = {
            id: Date.now().toString(),
            leagueName: form.league,
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
            isSwapped: false
        };

        const updatedList = [...matchList, newMatch].sort((a, b) => new Date(a.date) - new Date(b.date));
        setMatches(updatedList);
        setIsCreating(false);
    };

    const deleteMatch = (id) => {
        if(confirm("Delete this match?")) setMatches(matchList.filter(m => m.id !== id));
    };

    const clearSchedule = () => {
        if(confirm("DELETE ALL MATCHES?")) {
            setMatches([]);
            setShowSettings(false);
        }
    };

    const factoryReset = () => {
        if(confirm("FACTORY RESET? This deletes ALL data from the SERVER JSON.")) {
            setMatches([]);
            setTeams([]);
            setReferees([]);
            setShowSettings(false);
        }
    };

    const copyLink = (matchId, type) => {
        const host = window.location.hostname;
        const port = window.location.port;
        const baseUrl = `${window.location.protocol}//${host}:${port}${window.location.pathname}`;
        
        // Use the IP currently in the input box for the link
        let url = "";
        if (type === 'public') {
            url = `${baseUrl}?view=public&server=${encodeURIComponent(localIp)}`;
        } else if (type === 'scorebar') {
            url = `${baseUrl}?view=scorebar&matchId=${matchId}&server=${encodeURIComponent(localIp)}`;
        } else {
            url = `${baseUrl}?view=${type}&matchId=${matchId}&server=${encodeURIComponent(localIp)}`;
        }

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
        alert(`Link Copied!\nTarget Server: ${localIp}`);
    };

    const filtered = matchList.filter(m => tab === 'upcoming' ? m.status !== 'Finished' : m.status === 'Finished');

    return (
        <div className="max-w-6xl mx-auto p-6 relative">
            
            {/* Settings Dropdown */}
            {showSettings && (
                <div className="absolute top-16 right-6 z-50 bg-white shadow-2xl rounded-xl border p-4 w-72">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Settings size={16} /> Settings</h3>
                        <button onClick={() => setShowSettings(false)}><X size={16} /></button>
                    </div>
                    <div className="space-y-3">
                        <button onClick={clearSchedule} className="w-full text-left p-3 rounded bg-red-50 text-red-700 font-bold text-xs border border-red-200 flex gap-2"><Trash2 size={14}/> CLEAR SCHEDULE</button>
                        <button onClick={factoryReset} className="w-full text-left p-3 rounded bg-red-600 text-white font-bold text-xs shadow-sm flex gap-2"><AlertTriangle size={14}/> FACTORY RESET (DB)</button>
                    </div>
                </div>
            )}

            <header className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold flex gap-2"><Activity className="text-[#2F36CF]" /> Volleyball GFX</h1>
                        <p className="text-slate-500">Sun Siyam Media</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* SERVER IP INPUT */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                            <ServerIcon size={16} className={status === 'connected' ? 'text-green-500' : 'text-red-500'} />
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-400">SERVER URL</label>
                                <input 
                                    className="text-xs font-mono border-none p-0 focus:ring-0 w-48 text-slate-700" 
                                    value={localIp} 
                                    onChange={handleServerChange} 
                                    onBlur={applyServerChange} 
                                />
                            </div>
                            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                        <button onClick={() => setShowSettings(!showSettings)} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600"><Settings size={20} /></button>
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
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-xs font-bold">Date</label><input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <div><label className="text-xs font-bold">Time</label><input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full border p-2 rounded" /></div>
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

            <div className="flex gap-6 border-b mb-6">
                <button onClick={() => setTab('upcoming')} className={`pb-3 font-bold ${tab === 'upcoming' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Upcoming</button>
                <button onClick={() => setTab('history')} className={`pb-3 font-bold ${tab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>History</button>
            </div>

            <div className="space-y-4">
                {filtered.length === 0 && <div className="text-center py-20 bg-white border border-dashed rounded-xl text-slate-400">No matches found.</div>}
                
                {filtered.map(m => (
                    <div key={m.id} className="bg-white p-5 rounded-xl border flex justify-between items-center shadow-sm hover:shadow-md transition">
                        <div>
                            <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase mb-2"><span>{m.date}</span><span>{m.time}</span><span className="text-blue-500">{m.status}</span></div>
                            <div className="flex items-center gap-6"><span className="text-xl font-bold">{m.teamA.name}</span><span className="text-slate-300 font-black">VS</span><span className="text-xl font-bold">{m.teamB.name}</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1 mr-2">
                                {/* CAVA COPY BUTTON */}
                                <button onClick={() => copyLink(m.id, 'scorebar')} className="text-[10px] flex items-center gap-1 text-purple-600 hover:bg-purple-50 px-2 py-1 rounded border border-purple-200">
                                    <Copy size={10} /> CAVA Overlay
                                </button>
                                <button onClick={() => copyLink(m.id, 'output')} className="text-[10px] flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-100"><Copy size={10} /> Broadcast</button>
                                <button onClick={() => copyLink(m.id, 'stadium')} className="text-[10px] flex items-center gap-1 text-[#2F36CF] hover:bg-[#2F36CF]/10 px-2 py-1 rounded border border-[#2F36CF]/20"><Copy size={10} /> LED</button>
                            </div>
                            
                            <button onClick={() => onControl(m.id)} className="px-4 py-2 bg-slate-800 text-white rounded font-bold flex gap-2"><Monitor size={16} /> Control</button>
                            <button onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:${window.location.port}${window.location.pathname}?view=output&matchId=${m.id}&server=${encodeURIComponent(localIp)}`, '_blank')} className="px-4 py-2 bg-green-600 text-white rounded font-bold flex gap-2"><Tv size={16} /> Output</button>
                            <button onClick={() => deleteMatch(m.id)} className="px-3 py-2 bg-red-50 text-red-500 rounded"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}