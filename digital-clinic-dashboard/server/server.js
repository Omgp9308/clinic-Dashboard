// server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Keep path for potential other uses, but not for serving frontend here

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

// --- Revert CORS to Development-Friendly ---
// For local development, allow localhost:3000 (your local React frontend)
const allowedOrigins = [
    'http://localhost:3000', // Your local React frontend
    // Add any other specific origins here if needed for testing (e.g., from a different local IP)
];

// --- Create HTTP server and Socket.IO server ---
const server = http.createServer(app);

// Configure Socket.IO server with specific CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Allow only specified origins for local
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Make io instance accessible to controllers
app.set('socketio', io);


// --- Middleware ---
// Configure Express routes CORS
app.use(cors({
    origin: allowedOrigins, // Allow only specified origins for local
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
        console.log(`User disconnected: ${socket.id}`);
    });

    socket.on('joinRoom', (id) => {
        if (id) {
            socket.join(id);
            console.log(`Socket ${socket.id} joined room ${id} via joinRoom event`);
        }
    });
});


// --- API Routes (Backend will only serve API, not frontend static files) ---

// Basic test route for the root URL of the API
app.get('/', (req, res) => {
    res.send('Digital Clinic Backend API is running!');
});

// All other API routes
app.use('/api', authRoutes);
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);
app.use('/api/doctor', authenticateToken, authorizeRole(['doctor']), doctorRoutes);
app.use('/api/staff', authenticateToken, authorizeRole(['staff']), staffRoutes);
app.use('/api/patient', authenticateToken, authorizeRole(['patient']), patientRoutes);
app.use('/api/public', publicRoutes);


// --- Removed: Frontend Static File Serving ---
// app.use(express.static(...));
// app.get('*', ...);


// --- Error Handling Middleware (Will be added later) ---


// --- Start the Server ---
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access backend at: http://localhost:${PORT}`);
    console.log(`DB URL Loaded: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    console.log(`JWT Secret Loaded: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    console.log(`Frontend URL Allowed: ${allowedOrigins.join(', ')}`);
    console.log('Socket.IO server listening for connections.');
});
