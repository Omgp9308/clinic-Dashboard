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
  const [user, setUser] = useState(null); // State to hold logged-in user info

  // On initial load, check for user data in localStorage (from previous login)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const token = localStorage.getItem('token');
        if (parsedUser && token) {
            // Check if the parsedUser object itself contains the required properties
            // This prevents errors if localStorage has corrupted/incomplete data
            if (parsedUser.id && parsedUser.email && parsedUser.role && parsedUser.name) { // UPDATED: Check for name
                setUser(parsedUser);
            } else {
                console.error("Incomplete user data in localStorage. Clearing...");
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        } else {
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
    // Redirect based on role after successful login
    if (loggedInUser.role === 'admin') {
      navigate('/admin-dashboard');
    } else if (loggedInUser.role === 'doctor') {
      navigate('/doctor-dashboard');
    } else if (loggedInUser.role === 'staff') {
      navigate('/staff-dashboard');
    } else if (loggedInUser.role === 'patient') {
      navigate('/patient-dashboard');
    } else {
      navigate('/'); // Fallback to login if role is unknown
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/'); // Redirect to login page
  };

  return (
    <div className="App">
      <nav className="app-header">
        <h1>Digital Clinic Dashboard</h1>
        {user && (
          <div className="user-info">
            {/* UPDATED DISPLAY: Show Name (email) */}
            <span>Logged in as: {user.name} ({user.email}) - {user.role}</span> 
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