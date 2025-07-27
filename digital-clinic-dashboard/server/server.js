// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // NEW: Node.js built-in path module

dotenv.config();

const pool = require('./config/db');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const staffRoutes = require('./routes/staffRoutes');
const patientRoutes = require('./routes/patientRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Import authentication middleware
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origin for CORS (will use Railway env var in production)
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default to localhost for local dev.

// --- Create HTTP server and Socket.IO server ---
const server = http.createServer(app);

// Configure Socket.IO server with explicit CORS
const io = new Server(server, {
    cors: {
        origin: frontendUrl, // Allow connections from frontendUrl
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Make io instance accessible to controllers
app.set('socketio', io);


// --- Middleware ---
// Configure Express routes CORS
app.use(cors({
    origin: frontendUrl, // Allow requests from frontendUrl
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(bodyParser.json());


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    const userId = socket.handshake.query.userId;
    if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
    }

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on('joinRoom', (id) => {
        if (id) {
            socket.join(id);
            console.log(`Socket ${socket.id} joined room ${id} via joinRoom event`);
        }
    });
});


// --- Routes (API routes must come BEFORE serving static files!) ---

// Basic test route
// app.get('/', (req, res) => { // This will now be overridden by static serving for '/'
//     res.send('Digital Clinic Backend API is running!');
// });

// All API routes
app.use('/api', authRoutes);
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);
app.use('/api/doctor', authenticateToken, authorizeRole(['doctor']), doctorRoutes);
app.use('/api/staff', authenticateToken, authorizeRole(['staff']), staffRoutes);
app.use('/api/patient', authenticateToken, authorizeRole(['patient']), patientRoutes);
app.use('/api/public', publicRoutes);


// --- NEW: Serve Frontend Static Files ---
// In production, your React app is built into the 'build' folder inside the 'client' folder.
// The path here is relative to the 'server' directory.
const pathToClientBuild = path.join(__dirname, '..', 'client', 'build');
console.log(`Serving static files from: ${pathToClientBuild}`);
app.use(express.static(pathToClientBuild));

// --- NEW: Catch-all Route for React Router ---
// For any other GET request not handled by API routes, serve the React app's index.html
// This allows client-side routing to work.
app.get('*', (req, res) => {
    res.sendFile(path.join(pathToClientBuild, 'index.html'));
});


// --- Error Handling Middleware (Will be added later) ---


// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access backend at: http://localhost:${PORT}`);
    console.log(`DB URL Loaded: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    console.log(`JWT Secret Loaded: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    console.log(`Frontend URL Allowed: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('Socket.IO server listening for connections.');
});