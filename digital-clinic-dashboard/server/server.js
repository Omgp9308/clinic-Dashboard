// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

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

// --- CRITICAL: Define allowed origins for CORS ---
// In production, this should be ONLY your frontend's deployed URL
const allowedOrigins = [
    'http://localhost:3000', // For local frontend development
    'https://my-clinic-dashboard-ui.onrender.com' // REPLACE THIS with your frontend Static Site's Public URL (e.g., https://my-frontend-app-xyz.onrender.com)
];

// --- Create HTTP server and Socket.IO server ---
const server = http.createServer(app);

// Configure Socket.IO server with specific CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Allow connections only from defined origins
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true // Crucial for sending cookies/auth headers with WebSocket
    }
});

// Make io instance accessible to controllers (as before)
app.set('socketio', io);


// --- Middleware ---
// Configure Express routes CORS
app.use(cors({
    origin: allowedOrigins, // Allow requests only from defined origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true // Allow sending cookies/auth headers with HTTP requests
}));
app.use(bodyParser.json()); // To parse JSON request bodies


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User connected to Socket.IO: ${socket.id}`);

    // Handle custom event from client to join a user-specific room
    socket.on('joinRoom', (userId) => {
        socket.join(userId); // Join a room named after the user's ID
        console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from Socket.IO: ${socket.id}`);
    });
});


// --- Routes ---

// Basic test route
app.get('/', (req, res) => {
    res.send('Digital Clinic Backend API is running!');
});

// Authentication routes (publicly accessible for login/register)
app.use('/api', authRoutes);

// Admin routes (protected)
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);

// Doctor routes (protected)
app.use('/api/doctor', authenticateToken, authorizeRole(['doctor']), doctorRoutes);

// Staff routes (protected)
app.use('/api/staff', authenticateToken, authorizeRole(['staff']), staffRoutes);

// Patient routes (protected)
app.use('/api/patient', authenticateToken, authorizeRole(['patient']), patientRoutes);

// Publicly accessible routes
app.use('/api/public', publicRoutes);


// --- Error Handling Middleware (Will be added later if needed) ---


// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access backend at: http://localhost:${PORT}`);
    console.log(`Database URL (from .env): ${process.env.DATABASE_URL ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log(`JWT Secret (from .env): ${process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log('Socket.IO server listening for connections.');
});