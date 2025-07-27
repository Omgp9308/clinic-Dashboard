// client/src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';

const API_BASE_URL = window.location.origin;

function AdminDashboard() {
    const [newDoctor, setNewDoctor] = useState({
        email: '',
        password: '',
        name: '',
        specialization: '',
        contactInfo: ''
    });
    const [addDoctorMessage, setAddDoctorMessage] = useState('');
    const [queueData, setQueueData] = useState([]);
    const [patientCount, setPatientCount] = useState(0);
    const [adminError, setAdminError] = useState('');

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const fetchAdminData = async () => {
            setAdminError('');
            const token = getToken();
            if (!token) {
                setAdminError('Authentication token not found. Please log in again.');
                return;
            }

            try {
                // Fetch Queue Data
                const queueResponse = await fetch(`${API_BASE_URL}/api/admin/queue`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (queueResponse.ok) {
                    const data = await queueResponse.json();
                    setQueueData(data);
                } else {
                    const errorData = await queueResponse.json();
                    setAdminError(errorData.message || 'Failed to fetch queue data.');
                    console.error('Failed to fetch queue:', errorData);
                }

                // Fetch Patient Count
                const patientCountResponse = await fetch(`${API_BASE_URL}/api/admin/patients/count`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (patientCountResponse.ok) {
                    const data = await patientCountResponse.json();
                    setPatientCount(data.count);
                } else {
                    const errorData = await patientCountResponse.json();
                    setAdminError(errorData.message || 'Failed to fetch patient count.');
                    console.error('Failed to fetch patient count:', errorData);
                }

            } catch (error) {
                console.error('Network error fetching admin data:', error);
                setAdminError('Network error. Could not connect to the server.');
            }
        };

        fetchAdminData();
        const intervalId = setInterval(fetchAdminData, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const handleAddDoctorSubmit = async (e) => {
        e.preventDefault();
        setAddDoctorMessage('');
        setAdminError('');
        const token = getToken();

        if (!token) {
            setAddDoctorMessage('Authentication token not found. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/doctors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newDoctor)
            });

            const data = await response.json();

            if (response.ok) {
                setAddDoctorMessage(data.message || 'Doctor added successfully!');
                setNewDoctor({ email: '', password: '', name: '', specialization: '', contactInfo: '' });
            } else {
                setAddDoctorMessage(data.message || 'Failed to add doctor.');
            }
        } catch (error) {
            console.error('Network error adding doctor:', error);
            setAddDoctorMessage('Network error. Could not add doctor.');
        }
    };

    return (
        <div className="container">
            <h1>Admin Dashboard</h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '30px' }}>Welcome, Admin! Manage your clinic's operations here.</p>

            {adminError && (
                <div className="message error">
                    Error: {adminError}
                </div>
            )}

            {/* Section: Add New Doctor */}
            <div className="container" style={{ marginBottom: '40px' }}>
                <h2 className="section-heading">Add New Doctor</h2>
                <form onSubmit={handleAddDoctorSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label htmlFor="doctorEmail">Email:</label>
                        <input type="email" id="doctorEmail" value={newDoctor.email} onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })} required />
                    </div>
                    <div>
                        <label htmlFor="doctorPassword">Password:</label>
                        <input type="password" id="doctorPassword" value={newDoctor.password} onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })} required />
                    </div>
                    <div>
                        <label htmlFor="doctorName">Name:</label>
                        <input type="text" id="doctorName" value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} required />
                    </div>
                    <div>
                        <label htmlFor="doctorSpecialization">Specialization:</label>
                        <input type="text" id="doctorSpecialization" value={newDoctor.specialization} onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })} required />
                    </div>
                    <div className="form-span-2">
                        <label htmlFor="doctorContactInfo">Contact Info:</label>
                        <input type="text" id="doctorContactInfo" value={newDoctor.contactInfo} onChange={(e) => setNewDoctor({ ...newDoctor, contactInfo: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-success">
                        Add Doctor
                    </button>
                </form>
                {addDoctorMessage && (
                    <p className={`message ${addDoctorMessage.includes('successfully') ? 'success' : 'error'}`}>
                        {addDoctorMessage}
                    </p>
                )}
            </div>

            {/* Section: Overall Queue Monitor & Registered Patients Count Combined */}
            <div className="container">
                <h2 className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Overall Queue Monitor</span>
                    <span style={{ fontSize: '0.8em', color: '#6c757d' }}>
                        Registered Patients: <strong style={{ color: '#007bff', fontSize: '1.2em' }}>{patientCount}</strong>
                    </span>
                </h2>
                {queueData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777', padding: '20px 0' }}>No patients currently in the queue.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Queue No.</th>
                                    <th>Patient Name</th>
                                    <th>Doctor</th>
                                    <th>Specialization</th>
                                    <th>Status</th>
                                    <th>Entered At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queueData.map((entry) => (
                                    <tr key={entry.queue_entry_id}>
                                        <td>{entry.queue_number}</td>
                                        <td>{entry.patient_name}</td>
                                        <td>{entry.doctor_name}</td>
                                        <td>{entry.doctor_specialization}</td>
                                        <td>{entry.status}</td>
                                        <td>{new Date(entry.entered_at).toLocaleString()}</td>
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

export default AdminDashboard;