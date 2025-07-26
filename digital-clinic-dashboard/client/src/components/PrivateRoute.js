// client/src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children, requiredRole, user }) {
    // If user is not logged in or user object is missing
    if (!user) {
        return <Navigate to="/" replace />; // Redirect to login
    }

    // If user is logged in, but their role doesn't match the required role
    if (requiredRole && user.role !== requiredRole) {
        // You might want a more sophisticated unauthorized page or message here
        return <h2>Access Denied: You do not have permission to view this page.</h2>;
    }

    // If user is logged in and has the required role, render the children (dashboard component)
    return children;
}

export default PrivateRoute;