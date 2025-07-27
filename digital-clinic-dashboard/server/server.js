// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const pool = require('./config/db');

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Corrected from './('./routes/adminRoutes') if it was there
const doctorRoutes = require('./routes/doctorRoutes');
const staffRoutes = require('./routes/staffRoutes');
const patientRoutes = require('./routes/patientRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Import authentication middleware
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// --- Define allowed origin for CORS using Environment Variable ---
// Railway will provide process.env.FRONTEND_URL. Default to localhost for local dev.
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// --- Create HTTP server and Socket.IO server ---
const server = http.createServer(app);

// Configure Socket.IO server with explicit CORS
const io = new Server(server, {
    cors: {
        origin: frontendUrl, // Allow connections ONLY from your Vercel frontend URL
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true // Crucial for allowing cookies/auth headers with WebSocket
    }
});

// Make io instance accessible to controllers
app.set('socketio', io);


// --- Middleware ---
// Configure Express routes CORS
app.use(cors({
    origin: frontendUrl, // Allow requests ONLY from your Vercel frontend URL
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers to be sent cross-origin
    credentials: true // Allow sending cookies/auth headers with HTTP requests
}));
app.use(bodyParser.json());


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    // Handle custom event from client to join a user-specific room
    const userId = socket.handshake.query.userId;
    if (userId) {
        socket.join(userId); // Join a room named after the user's ID
        console.log(`Socket ${socket.id} joined room ${userId}`);
    }

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });

    // This event is emitted by PatientDashboard to explicitly join room
    socket.on('joinRoom', (id) => {
        if (id) {
            socket.join(id);
            console.log(`Socket ${socket.id} joined room ${id} via joinRoom event`);
        }
    });
});


// --- Routes ---

app.get('/', (req, res) => {
    res.send('Digital Clinic Backend API is running!');
});

app.use('/api', authRoutes);
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);
app.use('/api/doctor', authenticateToken, authorizeRole(['doctor']), doctorRoutes);
app.use('/api/staff', authenticateToken, authorizeRole(['staff']), staffRoutes);
app.use('/api/patient', authenticateToken, authorizeRole(['patient']), patientRoutes);
app.use('/api/public', publicRoutes);


// --- Error Handling Middleware (Will be added later) ---


// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access backend at: http://localhost:${PORT}`);
    // Log environment variables to confirm they are loaded (for Railway logs)
    console.log(`DB URL Loaded: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    console.log(`JWT Secret Loaded: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    console.log(`Frontend URL Allowed: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('Socket.IO server listening for connections.');
});