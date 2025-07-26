// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken'); // For JWT verification

// Get JWT Secret from environment variables
// IMPORTANT: Ensure process.env.JWT_SECRET is loaded BEFORE this file is required
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1); // Exit if critical env var is missing
}

// Middleware to verify JWT and authenticate user
exports.authenticateToken = (req, res, next) => {
    // Get the authorization header from the request
    const authHeader = req.headers['authorization'];
    // The token is usually in the format: "Bearer YOUR_JWT_TOKEN"
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token part

    if (token == null) {
        // No token provided
        return res.status(401).json({ message: 'Authentication failed: No token provided.' });
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token is invalid, expired, or tampered with
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({ message: 'Authentication failed: Invalid or expired token.' });
        }
        // Token is valid, attach user information from the token payload to the request object
        // This 'user' object contains { id, email, role } from when the token was signed during login.
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    });
};

// Middleware to authorize user based on role
// This is a "closure" that takes an array of allowed roles and returns a middleware function.
exports.authorizeRole = (roles) => {
    return (req, res, next) => {
        // Check if req.user (populated by authenticateToken) exists and has a role
        if (!req.user || !req.user.role) {
            // This scenario should ideally not happen if authenticateToken runs first,
            // but it's a good safeguard.
            return res.status(403).json({ message: 'Authorization failed: User role not found.' });
        }

        // Check if the user's role is included in the array of allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Authorization failed: Access denied for role '${req.user.role}'.` });
        }
        next(); // User is authorized, proceed
    };
};