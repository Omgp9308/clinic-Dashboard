// client/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import StaffDashboard from './pages/StaffDashboard';
import PatientDashboard from './pages/PatientDashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Basic check if token is still likely valid (optional, backend will verify fully)
        const token = localStorage.getItem('token');
        if (parsedUser && token) {
            // If token exists, assume user is logged in for UI purposes until API rejects
            setUser(parsedUser);
        } else {
            // Clear potentially stale data if no token
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'admin') {
      navigate('/admin-dashboard');
    } else if (loggedInUser.role === 'doctor') {
      navigate('/doctor-dashboard');
    } else if (loggedInUser.role === 'staff') {
      navigate('/staff-dashboard');
    } else if (loggedInUser.role === 'patient') {
      navigate('/patient-dashboard');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="App">
      {/* Apply app-header class */}
      <nav className="app-header">
        <h1>Digital Clinic Dashboard</h1>
        {user && (
          <div className="user-info">
            <span>Logged in as: {user.email} ({user.role})</span>
            {/* Apply btn-danger class */}
            <button onClick={handleLogout} className="btn-danger">
              Logout
            </button>
          </div>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/admin-dashboard" element={<PrivateRoute requiredRole="admin" user={user}><AdminDashboard /></PrivateRoute>} />
        <Route path="/doctor-dashboard" element={<PrivateRoute requiredRole="doctor" user={user}><DoctorDashboard /></PrivateRoute>} />
        <Route path="/staff-dashboard" element={<PrivateRoute requiredRole="staff" user={user}><StaffDashboard /></PrivateRoute>} />
        <Route path="/patient-dashboard" element={<PrivateRoute requiredRole="patient" user={user}><PatientDashboard /></PrivateRoute>} />
        <Route path="*" element={<h2>404 - Page Not Found</h2>} />
      </Routes>
    </div>
  );
}

export default App;