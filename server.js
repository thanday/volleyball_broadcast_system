import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3001; 
const DB_FILE = 'local_database.json'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  maxHttpBufferSize: 5e11,
  pingTimeout: 60000,
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const clientDistPath = path.join(__dirname, 'dist');
app.use(express.static(clientDistPath));

/* React SPA fallback */
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

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
    console.log("💾 Data saved to disk.");
  } catch (error) {
    console.error("❌ Error saving data:", error);
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 New Client Connected: ${socket.id}`);

  socket.emit('init_state', dataStore);

  socket.on('update_data', ({ key, value }) => {
    dataStore[key] = value;
    
    socket.broadcast.emit('sync_update', { key, value });
    
    saveData();
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client Disconnected: ${socket.id}`);
  });
});

loadData().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 LOCAL VOLLEYBALL SERVER RUNNING!
    -----------------------------------
    1. Local:   http://localhost:${PORT}
    2. Network: Find your IP (e.g., http://192.168.1.5:${PORT})
    `);
  });
});