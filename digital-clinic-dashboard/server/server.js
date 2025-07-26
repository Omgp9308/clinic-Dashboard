// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); // NEW: Node.js built-in HTTP module
const { Server } = require('socket.io'); // NEW: Import Server class from socket.io

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

// --- NEW: Create HTTP server and Socket.IO server ---
const server = http.createServer(app); // Create an HTTP server from Express app
const io = new Server(server, { // Initialize Socket.IO server
    cors: {
        origin: "http://localhost:3000", // Allow connection from your frontend URL
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Make io instance accessible to controllers
// This is a common pattern to pass the Socket.IO instance down
// to route handlers/controllers that need to emit events.
app.set('socketio', io);


// --- Middleware ---
app.use(cors()); // Configure CORS for Express routes
app.use(bodyParser.json());

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Example: Listen for a custom event from client
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });

    // You can add more socket listeners here if needed for bi-directional communication
});


// --- Routes ---

// Basic test route
app.get('/', (req, res) => {
    res.send('Digital Clinic Backend API is running!');
});

// Database Connection Test Route - COMMENTED OUT
/* ... (your commented out /test-db route) ... */

// Authentication routes (publicly accessible for login/register)
app.use('/api', authRoutes);

// Admin routes (protected: requires authentication and 'admin' role)
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);

// Doctor routes (protected: requires authentication and 'doctor' role)
app.use('/api/doctor', authenticateToken, authorizeRole(['doctor']), doctorRoutes);

// Staff routes (protected: requires authentication and 'staff' role)
app.use('/api/staff', authenticateToken, authorizeRole(['staff']), staffRoutes);

// Patient routes (protected: requires authentication and 'patient' role)
app.use('/api/patient', authenticateToken, authorizeRole(['patient']), patientRoutes);

// Publicly accessible routes (no authentication required for public list of doctors)
app.use('/api/public', publicRoutes);


// --- Error Handling Middleware (Will be added later) ---

// --- Start the Server ---
// UPDATED: Listen with the HTTP server, not just the Express app
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access backend at: http://localhost:${PORT}`);
    console.log(`Database URL (from .env): ${process.env.DATABASE_URL ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log(`JWT Secret (from .env): ${process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
    console.log('Socket.IO server listening for connections.');
});