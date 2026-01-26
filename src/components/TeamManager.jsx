import React, { useState } from 'react';
import { 
    Users, ChevronLeft, Plus, Trash2, LayoutGrid, UserPlus, 
    ImageIcon, Video as VideoIcon, Edit, X 
} from 'lucide-react';
// FIX: Import 'io' directly from the library so it is always available
import io from 'socket.io-client'; 
import { useVolleyballData } from '../context/VolleyballContext';

// Local Process Helper
const processFile = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
};

// --- Helper: Chunked File Upload (Socket.io) ---
const uploadChunkedFile = (file, serverUrl, onProgress) => {
    return new Promise((resolve, reject) => {
        // FIX: Use the imported 'io' function directly. 
        // No need to check window.io or load scripts.
        const socket = io(serverUrl); 
        
        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
        let offset = 0;

        socket.on('connect', () => {
            readAndSendChunk();
        });

        socket.on('chunk_received', (data) => {
            offset = data.offset;
            const progress = Math.round((offset / file.size) * 100);
            if (onProgress) onProgress(progress);

            if (offset < file.size) {
                readAndSendChunk();
            } else {
                socket.emit('upload_complete', { key: 'temp', fileName: file.name });
            }
        });

        socket.on('upload_success', ({ url }) => {
            socket.disconnect();
            // Prefix the URL with the server address so it works on other PCs
            const fullUrl = url.startsWith('http') ? url : `${serverUrl}${url}`;
            resolve(fullUrl); 
        });

        socket.on('upload_error', (err) => {
            socket.disconnect();
            reject(err.message || "Upload error");
        });

        socket.on('connect_error', (err) => {
            socket.disconnect();
            reject("Connection failed: " + err.message);
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

export default function TeamManager({ onBack }) {
    // GET SERVER URL FROM CONTEXT
    const { teams, setTeams, serverUrl } = useVolleyballData();
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamCountry, setNewTeamCountry] = useState('');
    
    // Player Editor State
    const [isAddingPlayer, setIsAddingPlayer] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [playerForm, setPlayerForm] = useState({ name: '', number: '', position: '', photo: '' });

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
            // FIX: Pass the correct serverUrl from context
            const fileUrl = await uploadChunkedFile(file, serverUrl, (progress) => {
                setUploadProgress(progress);
            });
            setPlayerForm(prev => ({ ...prev, photo: fileUrl }));
            alert("Video Upload Complete!");
        } catch (error) {
            console.error(error);
            alert("Upload Failed: " + error);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 h-screen flex flex-col">
            <header className="mb-6 flex gap-4 items-center">
                <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full">
                    <ChevronLeft />
                </button>
                <h1 className="text-2xl font-bold flex gap-2"><Users /> Team Manager</h1>
            </header>
            
            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* LEFT: TEAM LIST */}
                <div className="w-1/3 flex flex-col gap-4 bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex gap-2">
                        <input 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)} 
                            placeholder="New Team Name" 
                            className="flex-1 border p-2 rounded" 
                        />
                        <button 
                            onClick={() => { 
                                if (newTeamName) { 
                                    setTeams([...teamList, { id: Date.now().toString(), name: newTeamName, country: newTeamCountry, logo: '', flag: '', roster: [] }]); 
                                    setNewTeamName(''); 
                                } 
                            }} 
                            className="bg-blue-600 text-white p-2 rounded"
                        >
                            <Plus />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {teamList.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => setEditingTeamId(t.id)} 
                                className={`p-3 rounded border cursor-pointer flex justify-between items-center ${editingTeamId === t.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-slate-50'}`}
                            >
                                <span className="font-bold">{t.name}</span>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (confirm('Delete?')) setTeams(teamList.filter(x => x.id !== t.id)); 
                                    }} 
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: TEAM DETAILS */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 overflow-y-auto">
                    {activeTeam ? (
                        <div className="space-y-6">
                            {/* Team Header Info */}
                            <div className="flex gap-6 border-b pb-6">
                                <div className="w-32 h-32 bg-slate-100 rounded flex items-center justify-center relative border-2 border-dashed">
                                    {activeTeam.logo ? <img src={activeTeam.logo} className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Logo</span>}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => processFile(e.target.files[0], u => updateTeam(activeTeam.id, 'logo', u))} />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold">Name (Full)</label>
                                            <input value={activeTeam.name} onChange={e => updateTeam(activeTeam.id, 'name', e.target.value)} className="w-full border p-2 rounded font-bold" placeholder="e.g. MALDIVES" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold">Country/Short Code</label>
                                            <input value={activeTeam.country} onChange={e => updateTeam(activeTeam.id, 'country', e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. MDV" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold">Flag</label>
                                        <div className="flex items-center gap-2">
                                            {activeTeam.flag && <img src={activeTeam.flag} className="h-6" />}
                                            <input type="file" className="text-xs" onChange={e => processFile(e.target.files[0], u => updateTeam(activeTeam.id, 'flag', u))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Roster Section */}
                            <div>
                                <div className="flex justify-between mb-4">
                                    <h3 className="font-bold flex gap-2"><LayoutGrid size={20} /> Roster</h3>
                                    <button 
                                        onClick={() => { 
                                            setIsAddingPlayer(true); 
                                            setEditingPlayerId(null); 
                                            setPlayerForm({ name: '', number: '', position: '', photo: '' }); 
                                        }} 
                                        className="bg-slate-800 text-white px-3 py-1 rounded text-sm flex gap-2"
                                    >
                                        <UserPlus size={16} /> Add
                                    </button>
                                </div>

                                {isAddingPlayer && (
                                    <div className="bg-slate-50 p-4 rounded border mb-4 grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-2">
                                            <label className="text-xs">No.</label>
                                            <input value={playerForm.number} onChange={e => setPlayerForm({ ...playerForm, number: e.target.value })} className="w-full border p-1 rounded" />
                                        </div>
                                        <div className="col-span-4">
                                            <label className="text-xs">Name</label>
                                            <input value={playerForm.name} onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })} className="w-full border p-1 rounded" />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-xs">Pos</label>
                                            <select value={playerForm.position} onChange={e => setPlayerForm({ ...playerForm, position: e.target.value })} className="w-full border p-1 rounded">
                                                <option value="">Select...</option>
                                                <option value="Setter">Setter (S)</option>
                                                <option value="Outside Hitter">Outside Hitter (OH)</option>
                                                <option value="Opposite Hitter">Opposite Hitter (OP)</option>
                                                <option value="Middle Blocker">Middle Blocker (MB)</option>
                                                <option value="Libero">Libero (L)</option>
                                            </select>
                                        </div>
                                        
                                        <div className="col-span-12 grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                                            <div>
                                                <label className="text-xs font-bold block mb-1 flex items-center gap-1"><ImageIcon size={12} /> Image</label>
                                                <input type="file" accept="image/*" className="text-[10px] w-full" onChange={e => processFile(e.target.files[0], u => setPlayerForm({ ...playerForm, photo: u }))} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold block mb-1 flex items-center gap-1 text-purple-600"><VideoIcon size={12} /> Video Upload</label>
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
                                                <label className="text-xs font-bold block mb-1 text-slate-400">File Path</label>
                                                <input value={playerForm.photo} onChange={e => setPlayerForm({ ...playerForm, photo: e.target.value })} className="w-full border p-1 rounded text-xs" />
                                            </div>
                                        </div>

                                        <button 
                                            disabled={isUploading} 
                                            onClick={() => {
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
                                            }} 
                                            className="col-span-12 bg-blue-600 text-white p-2 rounded mt-2 font-bold disabled:bg-slate-400"
                                        >
                                            {isUploading ? 'Uploading...' : (editingPlayerId ? 'Update Player' : 'Save Player')}
                                        </button>
                                        <button onClick={() => { setIsAddingPlayer(false); setEditingPlayerId(null); }} className="col-span-12 bg-slate-200 text-slate-600 p-2 rounded mt-2 font-bold text-xs">Cancel</button>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                    {(activeTeam.roster || []).map(p => (
                                        <div key={p.id} className="border p-2 rounded flex items-center gap-2 relative group">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                                {p.photo ? (
                                                    (p.photo.match(/\.(mov|mp4|webm)$/i) || p.photo.includes('/uploads/')) 
                                                    ? <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-white">VID</div> 
                                                    : <img src={p.photo} className="w-full h-full object-cover" />
                                                ) : null}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">#{p.number} {p.name}</div>
                                                <div className="text-xs text-slate-500">{p.position}</div>
                                            </div>
                                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                                <button onClick={() => { setPlayerForm(p); setEditingPlayerId(p.id); setIsAddingPlayer(true); }} className="bg-white text-blue-500 rounded shadow-sm p-1 hover:bg-blue-50 border"><Edit size={12} /></button>
                                                <button onClick={() => updateTeam(activeTeam.id, 'roster', activeTeam.roster.filter(x => x.id !== p.id))} className="bg-white text-red-500 rounded shadow-sm p-1 hover:bg-red-50 border"><X size={12} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">Select a team to manage</div>
                    )}
                </div>
            </div>
        </div>
    );
}