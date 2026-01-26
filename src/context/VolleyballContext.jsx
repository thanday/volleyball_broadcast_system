import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import io from 'socket.io-client';

const VolleyballContext = createContext(null);

// --- CUSTOM HOOK: SYNC STATE WITH SERVER JSON ---
// This mimics the 'useSyncedState' from your previous code
function useSyncedState(key, defaultValue, socket) {
    const [value, setValue] = useState(defaultValue);
    
    // 1. Listen for updates FROM the server
    useEffect(() => {
        if (!socket) return;

        const onInit = (allData) => {
            if (allData && allData[key] !== undefined) {
                setValue(allData[key]);
            }
        };

        const onUpdate = (data) => {
            if (data.key === key) {
                setValue(data.value);
            }
        };

        socket.on('init_state', onInit);
        socket.on('sync_update', onUpdate);

        return () => {
            socket.off('init_state', onInit);
            socket.off('sync_update', onUpdate);
        };
    }, [socket, key]);

    // 2. Send updates TO the server
    const setSharedValue = (newValue) => {
        // Optimistic update (update local immediately)
        setValue(newValue);
        
        // Emit to server to save to JSON
        if (socket && socket.connected) {
            socket.emit('update_data', { key, value: newValue });
        }
    };

    return [value, setSharedValue];
}

export const VolleyballDataProvider = ({ children }) => {
    // 1. DETERMINE SERVER URL
    const [serverUrl, setServerUrl] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('server') || window.localStorage.getItem('volleyball_server_url') || 'http://localhost:3001';
    });

    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('disconnected');

    // 2. CONNECT SOCKET
    useEffect(() => {
        const newSocket = io(serverUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            timeout: 20000
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ Connected to Server DB:', serverUrl);
            setStatus('connected');
        });

        newSocket.on('disconnect', () => setStatus('disconnected'));
        newSocket.on('connect_error', () => setStatus('error'));

        return () => newSocket.close();
    }, [serverUrl]);

    // 3. SYNCED STATES (Matches, Teams, Referees)
    // These now live in 'local_database.json' on the server
    const [matches, setMatches] = useSyncedState('volleyball_matches', [], socket);
    const [teams, setTeams] = useSyncedState('volleyball_teams', [], socket);
    const [referees, setReferees] = useSyncedState('volleyball_referees', [], socket);

    return (
        <VolleyballContext.Provider value={{
            matches, setMatches,
            teams, setTeams,
            referees, setReferees,
            status,
            serverUrl, setServerUrl
        }}>
            {children}
        </VolleyballContext.Provider>
    );
};

export const useVolleyballData = () => useContext(VolleyballContext);