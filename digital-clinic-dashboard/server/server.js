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

// --- NEW: CORS Options for Express and Socket.IO ---
// This allows any origin (*) to connect, and allows sending credentials (like JWT tokens).
// This is temporary for debugging deployment. In production, 'origin' should be your specific frontend URL.
const corsOptions = {
    origin: "*", // Allow all origins for testing
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allow all common HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers to be sent cross-origin
    credentials: true // Crucial: allow sending cookies, Authorization headers etc.
};

// --- Create HTTP server and Socket.IO server ---
const server = http.createServer(app);

// Configure Socket.IO server with the same CORS options
const io = new Server(server, {
    cors: corsOptions // Apply the defined corsOptions
});

// Make io instance accessible to controllers
app.set('socketio', io);


// --- Middleware ---
// Apply CORS to Express routes
app.use(cors(corsOptions)); // Apply the defined corsOptions
app.use(bodyParser.json()); // To parse JSON request bodies


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User connected to Socket.IO: ${socket.id}`);

    socket.on('joinRoom', (userId) => {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected from Socket.IO: ${socket.id}`);
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
    console.log(`Database URL (from .env): ${process.env.DATABASE_URL ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log(`JWT Secret (from .env): ${process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log('Socket.IO server listening for connections.');
});