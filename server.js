import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises'; // For JSON Database (Async)
import fsLegacy from 'fs';    // For Video Streams (Append)
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3001; 
const DB_FILE = 'local_database.json'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// --- FIX 1: SAVE UPLOADS OUTSIDE 'DIST' ---
// Changed from 'dist/uploads' to just 'uploads' (Project Root)
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fsLegacy.existsSync(UPLOADS_DIR)){
    fsLegacy.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- 1. ENABLE CORS (Allow All IPs) ---
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// 2. Socket.IO Setup
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e8, 
  pingTimeout: 60000,
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- FIX 2: SERVE STATIC FILES ---
const clientDistPath = path.join(__dirname, 'dist');

// Serve the React App (Frontend)
app.use(express.static(clientDistPath));

// Serve the Uploads Folder explicitly at /uploads
// This allows the frontend to access http://localhost:3001/uploads/video.mp4
app.use('/uploads', express.static(UPLOADS_DIR));


// --- DATABASE LOGIC ---
let dataStore = {};

async function loadData() {
  try {
    const data = await fs.readFile(path.join(__dirname, DB_FILE), 'utf-8');
    dataStore = JSON.parse(data);
    console.log("✅ Data loaded from local file.");
  } catch (error) {
    console.log("ℹ️ No existing database found. Starting fresh.");
    dataStore = {};
  }
}

async function saveData() {
  try {
    await fs.writeFile(path.join(__dirname, DB_FILE), JSON.stringify(dataStore, null, 2));
  } catch (error) {
    console.error("❌ Error saving data:", error);
  }
}

// --- 3. API ENDPOINT FOR POLLING ---
app.get('/matches', (req, res) => {
    res.json(dataStore.volleyball_matches || []);
});

// Catch-all for React Frontend (Must be AFTER other routes)
// Exclude /uploads so it doesn't try to serve index.html for videos
app.get(/^(?!\/socket\.io|\/uploads|\/matches).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
  console.log(`🔌 New Client Connected: ${socket.id}`);

  socket.emit('init_state', dataStore);

  socket.on('update_data', ({ key, value }) => {
    dataStore[key] = value;
    socket.broadcast.emit('sync_update', { key, value });
    saveData();
  });

  socket.on('request_sync', () => {
     socket.emit('init_state', dataStore);
  });
  
  socket.on('upload_chunk', ({ fileName, data, offset }) => {
    // This now saves to the ROOT 'uploads' folder
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    if (offset === 0) {
        fsLegacy.writeFile(filePath, Buffer.from(data), (err) => {
            if (err) {
                console.error(`Error writing file ${fileName}:`, err);
                socket.emit('upload_error', { message: 'Write failed' });
            } else {
                socket.emit('chunk_received', { offset: offset + data.byteLength });
            }
        });
    } else {
        fsLegacy.appendFile(filePath, Buffer.from(data), (err) => {
            if (err) {
                console.error(`Error appending chunk to ${fileName}:`, err);
                socket.emit('upload_error', { message: 'Append failed' });
            } else {
                socket.emit('chunk_received', { offset: offset + data.byteLength });
            }
        });
    }
  });

  // 2. Handle completion
  socket.on('upload_complete', ({ key, fileName }) => {
    console.log(`✅ File upload finished: ${fileName}`);
    
    // The public URL remains the same, handled by app.use('/uploads', ...)
    const publicUrl = `/uploads/${fileName}`;

    if (key && key !== 'temp') {
        dataStore[key] = publicUrl;
        io.emit('sync_update', { key, value: publicUrl });
        saveData();
    }
    
    socket.emit('upload_success', { url: publicUrl });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client Disconnected: ${socket.id}`);
  });
});

// --- START SERVER ---
loadData().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 LOCAL VOLLEYBALL SERVER RUNNING!
    -----------------------------------
    1. Local:   http://localhost:${PORT}
    2. Network: Find your IP (e.g., http://192.168.1.5:${PORT})
    3. Uploads: Saved to Project Root /uploads/
    `);
  });
});