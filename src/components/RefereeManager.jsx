import React, { useState } from 'react';
import { ChevronLeft, UserCheck, Trash2 } from 'lucide-react';
import { useVolleyballData } from '../context/VolleyballContext';

export default function RefereeManager({ onBack }) {
    const { referees, setReferees } = useVolleyballData();
    const [newRef, setNewRef] = useState({ name: '', country: '' });

    const safeReferees = Array.isArray(referees) ? referees : [];

    const handleAdd = () => {
        if (newRef.name) {
            setReferees([...safeReferees, { id: Date.now().toString(), ...newRef }]);
            setNewRef({ name: '', country: '' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-6 flex justify-between items-center">
                <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full">
                    <ChevronLeft />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <UserCheck /> Referee Manager
                </h1>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500">Name</label>
                    <input 
                        value={newRef.name} 
                        onChange={e => setNewRef({ ...newRef, name: e.target.value })} 
                        className="w-full border p-2 rounded" 
                    />
                </div>
                <div className="w-1/3">
                    <label className="text-xs font-bold text-slate-500">Country</label>
                    <input 
                        value={newRef.country} 
                        onChange={e => setNewRef({ ...newRef, country: e.target.value })} 
                        className="w-full border p-2 rounded" 
                    />
                </div>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
                    Add
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Country</th>
                            <th className="p-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {safeReferees.map(r => (
                            <tr key={r.id} className="border-b last:border-0">
                                <td className="p-3 font-bold">{r.name}</td>
                                <td className="p-3">{r.country}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => setReferees(safeReferees.filter(x => x.id !== r.id))} className="text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}