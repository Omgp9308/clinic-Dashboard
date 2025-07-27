// client/src/pages/PatientDashboard.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

// UPDATED: Dynamically get API_BASE_URL from the browser's current domain
const API_BASE_URL = window.location.origin;
const SOCKET_SERVER_URL = API_BASE_URL; // Socket.IO server runs on the same URL as API

function PatientDashboard() {
    // Helper function to get default appointment time
    const getDefaultAppointmentTime = () => {
        const now = new Date();
        let date = new Date(now.getTime() + 30 * 60 * 1000); // Start 30 minutes from now

        // Round up to the next 15-minute interval
        const minutes = date.getMinutes();
        const remainder = minutes % 15;
        if (remainder !== 0) {
            date.setMinutes(minutes + (15 - remainder));
        }
        date.setSeconds(0); // Set seconds to 0
        date.setMilliseconds(0); // Set milliseconds to 0

        // If before 8 AM, set to 8 AM
        if (date.getHours() < 8) {
            date.setHours(8);
            date.setMinutes(0);
        }
        // If after 8 PM, set to next day's 8 AM
        else if (date.getHours() >= 20) { // 20:00 is 8 PM
            date.setDate(date.getDate() + 1);
            date.setHours(8);
            date.setMinutes(0);
        }

        // Format to YYYY-MM-DDTHH:MM for datetime-local input
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    // Helper function to calculate min/max dates for picker
    const getMinMaxDates = () => {
        const now = new Date();
        const minDate = new Date(now.getTime() + 30 * 60 * 1000); // Minimum 30 mins from now
        const maxDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // Maximum 15 days from now

        // Format to YYYY-MM-DDTHH:MM for datetime-local input's min/max attributes
        const formatForPicker = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        return {
            min: formatForPicker(minDate),
            max: formatForPicker(maxDate)
        };
    };

    const { min: minAppointmentDateTime, max: maxAppointmentDateTime } = getMinMaxDates();


    // State for "My Turn"
    const [myTurnInfo, setMyTurnInfo] = useState(null);
    // State for "Book Appointment" form
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [appointmentTime, setAppointmentTime] = useState(getDefaultAppointmentTime());
    const [bookAppointmentMessage, setBookAppointmentMessage] = useState('');
    // State for "My Appointments" list
    const [myAppointments, setMyAppointments] = useState([]);
    const [patientError, setPatientError] = useState('');
    // State for real-time notifications
    const [notification, setNotification] = useState(null);

    const getToken = () => localStorage.getItem('token');
    const getUser = () => { // Helper to get user object from localStorage
        const userString = localStorage.getItem('user');
        return userString ? JSON.parse(userString) : null;
    };


    // --- Fetch Patient Data (My Turn, My Appointments, Doctors for Booking) ---
    const fetchPatientData = async () => { // Moved function out to be callable
        setPatientError('');
        const token = getToken();
        if (!token) {
            setPatientError('Authentication token not found. Please log in again.');
            return;
        }

        try {
            // Fetch My Turn Information
            const turnResponse = await fetch(`${API_BASE_URL}/api/patient/my-turn`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (turnResponse.ok) {
                const data = await turnResponse.json();
                setMyTurnInfo(data);
            } else if (turnResponse.status === 404) {
                setMyTurnInfo(null); // Not in queue
            } else {
                const errorData = await turnResponse.json();
                setPatientError(errorData.message || 'Failed to fetch turn information.');
                console.error('Failed to fetch turn info:', errorData);
            }

            // Fetch My Appointments
            const appointmentsResponse = await fetch(`${API_BASE_URL}/api/patient/my-appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (appointmentsResponse.ok) {
                const data = await appointmentsResponse.json();
                setMyAppointments(data);
            } else {
                const errorData = await appointmentsResponse.json();
                setPatientError(errorData.message || 'Failed to fetch appointments.');
                console.error('Failed to fetch appointments:', errorData);
            }

            // Fetch Doctors List for booking
            const doctorsResponse = await fetch(`${API_BASE_URL}/api/public/doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (doctorsResponse.ok) {
                const data = await doctorsResponse.json();
                setDoctors(data);
                if (data.length > 0 && !selectedDoctorId) {
                    setSelectedDoctorId(data[0].id);
                }
            } else {
                const errorData = await doctorsResponse.json();
                setPatientError(errorData.message || 'Failed to fetch doctors list.');
                console.error('Failed to fetch doctors:', errorData);
            }

        } catch (error) {
            console.error('Network error fetching patient data:', error);
            setPatientError('Network error. Could not connect to the server.');
        }
    };

    useEffect(() => {
        fetchPatientData();
        const intervalId = setInterval(fetchPatientData, 15000);
        return () => clearInterval(intervalId);
    }, [selectedDoctorId]);


    // --- Socket.IO Integration for Real-time Notifications ---
    useEffect(() => {
        const user = getUser();
        if (!user || !user.id) {
            console.log("No user ID found for Socket.IO connection. Not connecting Socket.");
            return;
        }

        const socket = io(SOCKET_SERVER_URL, {
            query: { userId: user.id },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log(`Socket connected for patient ${user.id}: ${socket.id}`);
            socket.emit('joinRoom', user.id);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected for patient ${user.id}`);
        });

        socket.on('appointment_status_update', (data) => {
            console.log('Received real-time notification:', data);
            setNotification(data.message);
            setTimeout(() => setNotification(null), 7000);

            fetchPatientData();
        });

        return () => {
            socket.disconnect();
        };
    }, []);


    // --- Handle Book Appointment ---
    const handleBookAppointment = async (e) => {
        e.preventDefault();
        setBookAppointmentMessage('');
        setPatientError('');
        const token = getToken();

        if (!token) {
            setBookAppointmentMessage('Authentication token not found. Please log in again.');
            return;
        }
        if (!selectedDoctorId || !appointmentTime) {
            setBookAppointmentMessage('Please select a doctor and appointment time.');
            return;
        }

        // Client-Side Appointment Time Validation (Mirroring Backend)
        const now = new Date();
        const inputDate = new Date(appointmentTime);

        let formattedAppointmentTime = null;
        try {
            formattedAppointmentTime = inputDate.toISOString();
        } catch (err) {
            setBookAppointmentMessage('Invalid appointment time format. Please select from the picker.');
            console.error('Frontend Date parsing error:', err);
            return;
        }

        const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000);
        if (inputDate < minFutureTime) {
            setBookAppointmentMessage('Appointment must be at least 30 minutes from now.');
            return;
        }

        const hours = inputDate.getHours();
        if (hours < 8 || hours >= 20) {
            setBookAppointmentMessage('Appointments can only be scheduled between 8 AM and 8 PM.');
            return;
        }

        const minutes = inputDate.getMinutes();
        if (minutes % 15 !== 0) {
            setBookAppointmentMessage('Appointment time must be in 15-minute intervals (e.g., XX:00, XX:15, XX:30, XX:45).');
            return;
        }

        const maxFutureTime = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (inputDate > maxFutureTime) {
            setBookAppointmentMessage('Appointment cannot be more than 15 days in the future.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/patient/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctorId: parseInt(selectedDoctorId, 10),
                    appointmentTime: formattedAppointmentTime
                })
            });

            const data = await response.json();

            if (response.ok) {
                setBookAppointmentMessage(data.message || 'Appointment booked successfully!');
                setAppointmentTime(getDefaultAppointmentTime());
            } else {
                setBookAppointmentMessage(data.message || 'Failed to book appointment.');
            }
        } catch (error) {
            console.error('Network error booking appointment:', error);
            setBookAppointmentMessage('Network error. Could not book appointment.');
        }
    };

    // Handle Cancel Appointment
    const handleCancelAppointment = async (appointmentId) => {
        setPatientError('');
        const token = getToken();

        if (!window.confirm('Are you sure you want to cancel this appointment?')) {
            return;
        }
        if (!token) {
            setPatientError('Authentication token not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/patient/appointments/${appointmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setPatientError(data.message || 'Appointment cancelled successfully!');
            } else {
                setPatientError(data.message || 'Failed to cancel appointment.');
            }
        } catch (error) {
            console.error('Network error cancelling appointment:', error);
            setPatientError('Network error. Could not cancel appointment.');
        }
    };


    return (
        <div className="container">
            <h1>Patient Dashboard</h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '30px' }}>Welcome, Patient! Manage your appointments and queue status here.</p>

            {patientError && (
                <div className="message error">
                    Error: {patientError}
                </div>
            )}
            {notification && (
                <div className="message success" style={{ backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeeba' }}>
                    {notification}
                </div>
            )}

            {/* Section: My Turn Information */}
            <div className="container" style={{ marginBottom: '40px' }}>
                <h2 className="section-heading">My Turn in Queue</h2>
                {myTurnInfo ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <p><strong>Status:</strong> {myTurnInfo.status}</p>
                        <p><strong>Queue Number:</strong> {myTurnInfo.queueNumber}</p>
                        <p className="form-span-2"><strong>Doctor:</strong> {myTurnInfo.doctorName} ({myTurnInfo.doctorSpecialization})</p>
                        <p className="form-span-2"><strong>Patients Ahead of You:</strong> {myTurnInfo.patientsAhead}</p>
                        <p className="form-span-2"><strong>Estimated Wait Time:</strong> {myTurnInfo.estimatedWaitTimeMinutes} minutes</p>
                        <p className="form-span-2" style={{ fontWeight: 'bold', marginTop: '10px' }}>{myTurnInfo.message}</p>
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#777', padding: '20px 0' }}>You are not currently in any active queue.</p>
                )}
            </div>

            {/* Section: Book New Appointment */}
            <div className="container" style={{ marginBottom: '40px' }}>
                <h2 className="section-heading">Book New Appointment</h2>
                <form onSubmit={handleBookAppointment}>
                    <div>
                        <label htmlFor="selectDoctor">Select Doctor (Required):</label>
                        <select
                            id="selectDoctor"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            required
                        >
                            <option value="">Select</option>
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name} ({doctor.specialization})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="appointmentTime">Appointment Time (Required):</label>
                        <input
                            type="datetime-local"
                            id="appointmentTime"
                            value={appointmentTime}
                            onChange={(e) => setAppointmentTime(e.target.value)}
                            required
                            min={minAppointmentDateTime}
                            max={maxAppointmentDateTime}
                        />
                    </div>
                    <button type="submit" className="btn-success">
                        Book Appointment
                    </button>
                </form>
                {bookAppointmentMessage && (
                    <p className={`message ${bookAppointmentMessage.includes('successfully') ? 'success' : 'error'}`}>
                        {bookAppointmentMessage}
                    </p>
                )}
            </div>

            {/* Section: My Appointments */}
            <div className="container">
                <h2 className="section-heading">My Appointments</h2>
                {myAppointments.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777', padding: '20px 0' }}>You have no appointments booked.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Doctor</th>
                                    <th>Specialization</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myAppointments.map((appointment) => (
                                    <tr key={appointment.appointment_id}>
                                        <td>{appointment.doctor_name}</td>
                                        <td>{appointment.specialization}</td>
                                        <td>{new Date(appointment.appointment_time).toLocaleString()}</td>
                                        <td>{appointment.status}</td>
                                        <td>
                                            {(appointment.status === 'scheduled' || appointment.status === 'waiting' || appointment.status === 'consulting') && (
                                                <button
                                                    onClick={() => handleCancelAppointment(appointment.appointment_id)}
                                                    className="btn-danger"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PatientDashboard;