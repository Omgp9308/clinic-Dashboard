// client/src/pages/DoctorDashboard.js
import React, { useState, useEffect } from 'react';

// UPDATED: Dynamically get API_BASE_URL from the browser's current domain
const API_BASE_URL = window.location.origin;

function DoctorDashboard() {
    const [doctorQueue, setDoctorQueue] = useState([]);
    const [currentPatient, setCurrentPatient] = useState(null);
    const [denialReason, setDenialReason] = useState('');
    const [denyMessage, setDenyMessage] = useState('');
    const [callNextMessage, setCallNextMessage] = useState('');
    const [doctorError, setDoctorError] = useState('');

    const getToken = () => localStorage.getItem('token');

    const fetchDoctorData = async () => {
        setDoctorError('');
        const token = getToken();
        if (!token) {
            setDoctorError('Authentication token not found. Please log in again.');
            return;
        }

        try {
            // Fetch Doctor's Queue Data
            const queueResponse = await fetch(`${API_BASE_URL}/api/doctor/my-queue`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (queueResponse.ok) {
                const data = await queueResponse.json();
                setDoctorQueue(data);
            } else {
                const errorData = await queueResponse.json();
                setDoctorError(errorData.message || 'Failed to fetch queue data.');
                console.error('Failed to fetch doctor queue:', errorData);
            }

            // Fetch Current Patient Details
            const currentPatientResponse = await fetch(`${API_BASE_URL}/api/doctor/current-patient`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (currentPatientResponse.ok) {
                const data = await currentPatientResponse.json();
                setCurrentPatient(data);
            } else if (currentPatientResponse.status === 404) {
                setCurrentPatient(null);
            } else {
                const errorData = await currentPatientResponse.json();
                setDoctorError(errorData.message || 'Failed to fetch current patient details.');
                console.error('Failed to fetch current patient:', errorData);
            }

        } catch (error) {
            console.error('Network error fetching doctor data:', error);
            setDoctorError('Network error. Could not connect to the server.');
        }
    };

    useEffect(() => {
        fetchDoctorData();
        const intervalId = setInterval(fetchDoctorData, 15000);
        return () => clearInterval(intervalId);
    }, []);


    const handleDenyService = async (appointmentId) => {
        if (!denialReason) {
            setDenyMessage('Please provide a reason for denial.');
            return;
        }

        setDenyMessage('');
        setDoctorError('');
        const token = getToken();

        if (!token) {
            setDenyMessage('Authentication token not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/doctor/queue/${appointmentId}/deny`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: denialReason })
            });

            const data = await response.json();

            if (response.ok) {
                setDenyMessage(data.message || 'Service denied successfully!');
                setDenialReason('');
                fetchDoctorData();
            } else {
                setDenyMessage(data.message || 'Failed to deny service.');
            }
        } catch (error) {
            console.error('Network error denying service:', error);
            setDenyMessage('Network error. Could not deny service.');
        }
    };

    const handleCallNextPatient = async () => {
        setCallNextMessage('');
        setDoctorError('');
        const token = getToken();

        if (!token) {
            setCallNextMessage('Authentication token not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/doctor/complete-current-patient`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setCallNextMessage(data.message || 'Operation successful!');
                fetchDoctorData();
            } else {
                setCallNextMessage(data.message || 'Failed to call next patient.');
            }
        } catch (error) {
            console.error('Network error calling next patient:', error);
            setCallNextMessage('Network error. Could not call next patient.');
        }
    };

    return (
        <div className="container">
            <h1>Doctor Dashboard</h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '30px' }}>Welcome, Doctor! Manage your patient consultations here.</p>

            {doctorError && (
                <div className="message error">
                    Error: {doctorError}
                </div>
            )}
            {callNextMessage && (
                <div className={`message ${callNextMessage.includes('successfully') || callNextMessage.includes('completed') || callNextMessage.includes('called') ? 'success' : 'error'}`}>
                    {callNextMessage}
                </div>
            )}

            {/* Section: Current Patient Details */}
            <div className="container" style={{ marginBottom: '40px' }}>
                <h2 className="section-heading">Current Patient</h2>
                {currentPatient ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <p><strong>Name:</strong> {currentPatient.name}</p>
                        <p><strong>Age:</strong> {currentPatient.age}</p>
                        <p><strong>Gender:</strong> {currentPatient.gender}</p>
                        <p><strong>Contact Info:</strong> {currentPatient.contact_info}</p>
                        <p className="form-span-2"><strong>Dietary Restrictions:</strong> {currentPatient.dietary_restrictions || 'None'}</p>
                        <p className="form-span-2"><strong>Allergies:</strong> {currentPatient.allergies || 'None'}</p>
                        <p><strong>Queue Number:</strong> {currentPatient.queue_number}</p>
                        <div className="form-span-2" style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button onClick={handleCallNextPatient} className="btn-primary">
                                Complete Appointment & Call Next Patient
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#777', padding: '20px 0' }}>No patient currently in consultation.</p>
                        {doctorQueue.length > 0 && (
                            <button onClick={handleCallNextPatient} className="btn-primary">
                                Call First Patient to Consultation
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Section: My Patient Queue */}
            <div className="container">
                <h2 className="section-heading">My Patient Queue</h2>
                {doctorQueue.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777', padding: '20px 0' }}>Your queue is currently empty.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Queue No.</th>
                                    <th>Patient Name</th>
                                    <th>Age</th>
                                    <th>Status</th>
                                    <th>Appointment Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {doctorQueue.map((entry) => (
                                    <tr key={entry.queue_entry_id}>
                                        <td>{entry.queue_number}</td>
                                        <td>{entry.patient_name}</td>
                                        <td>{entry.patient_age}</td>
                                        <td>{entry.status}</td>
                                        <td>{new Date(entry.appointment_time).toLocaleString()}</td>
                                        <td>
                                            {(entry.status === 'waiting' || entry.status === 'consulting') && (
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('Enter reason to deny service for ' + entry.patient_name + ':');
                                                        if (reason) {
                                                            setDenialReason(reason);
                                                            handleDenyService(entry.appointment_id);
                                                        }
                                                    }}
                                                    className="btn-danger"
                                                >
                                                    Deny Service
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {denyMessage && (
                    <p className={`message ${denyMessage.includes('successfully') ? 'success' : 'error'}`}>
                        {denyMessage}
                    </p>
                )}
            </div>
        </div>
    );
}

export default DoctorDashboard;