// client/src/pages/StaffDashboard.js
import React, { useState, useEffect } from 'react';

// UPDATED: Dynamically get API_BASE_URL from the browser's current domain
const API_BASE_URL = window.location.origin;

function StaffDashboard() {
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


    // State for scheduling form
    const [patientName, setPatientName] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [patientContactInfo, setPatientContactInfo] = useState('');
    const [patientDietaryRestrictions, setPatientDietaryRestrictions] = useState('');
    const [patientAllergies, setPatientAllergies] = useState(''); // Corrected: useState declaration
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [appointmentTime, setAppointmentTime] = useState(getDefaultAppointmentTime());
    const [scheduleMessage, setScheduleMessage] = useState('');

    // State for fetched data
    const [doctors, setDoctors] = useState([]);
    const [next3InQueue, setNext3InQueue] = useState([]);
    const [staffError, setStaffError] = useState('');

    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        const fetchStaffData = async () => {
            setStaffError('');
            const token = getToken();
            if (!token) {
                setStaffError('Authentication token not found. Please log in again.');
                return;
            }

            try {
                // Fetch list of doctors (from public endpoint)
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
                    setStaffError(errorData.message || 'Failed to fetch doctors list.');
                    console.error('Failed to fetch doctors:', errorData);
                }

                // Fetch next 3 in queue
                const queueResponse = await fetch(`${API_BASE_URL}/api/staff/queue/next3`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (queueResponse.ok) {
                    const data = await queueResponse.json();
                    setNext3InQueue(data);
                } else {
                    const errorData = await queueResponse.json();
                    setStaffError(errorData.message || 'Failed to fetch next 3 in queue.');
                    console.error('Failed to fetch next 3 in queue:', errorData);
                }

            } catch (error) {
                console.error('Network error fetching staff data:', error);
                setStaffError('Network error. Could not connect to the server.');
            }
        };

        fetchStaffData();
        const intervalId = setInterval(fetchStaffData, 15000);
        return () => clearInterval(intervalId);
    }, [selectedDoctorId]);

    const handleScheduleAppointment = async (e) => {
        e.preventDefault();
        setScheduleMessage('');
        setStaffError('');
        const token = getToken();

        if (!token) {
            setScheduleMessage('Authentication token not found. Please log in again.');
            return;
        }
        if (!selectedDoctorId) {
            setScheduleMessage('Please select a doctor.');
            return;
        }
        if (!appointmentTime) {
            setScheduleMessage('Please specify an appointment time.');
            return;
        }

        // Client-Side Appointment Time Validation (Mirroring Backend)
        const now = new Date();
        const inputDate = new Date(appointmentTime);

        let formattedAppointmentTime = null;
        try {
            formattedAppointmentTime = inputDate.toISOString();
        } catch (err) {
            setScheduleMessage('Invalid appointment time format. Please select from the picker.');
            console.error('Frontend Date parsing error:', err);
            return;
        }

        // 1. Check if appointment is in the past or too soon (less than 30 mins from now)
        const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000);
        if (inputDate < minFutureTime) {
            setScheduleMessage('Appointment must be at least 30 minutes from now.');
            return;
        }

        // 2. Check if appointment is outside 8 AM to 8 PM range
        const hours = inputDate.getHours();
        if (hours < 8 || hours >= 20) {
            setScheduleMessage('Appointments can only be scheduled between 8 AM and 8 PM.');
            return;
        }

        // 3. Check for 15-minute slots (minutes must be 00, 15, 30, or 45)
        const minutes = inputDate.getMinutes();
        if (minutes % 15 !== 0) {
            setScheduleMessage('Appointment time must be in 15-minute intervals (e.g., XX:00, XX:15, XX:30, XX:45).');
            return;
        }

        // 4. Check if appointment is within the next 15 days
        const maxFutureTime = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (inputDate > maxFutureTime) {
            setScheduleMessage('Appointment cannot be more than 15 days in the future.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/staff/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientName,
                    patientAge: patientAge ? parseInt(patientAge, 10) : null,
                    patientGender,
                    patientContactInfo,
                    patientDietaryRestrictions,
                    patientAllergies,
                    doctorId: parseInt(selectedDoctorId, 10),
                    appointmentTime: formattedAppointmentTime
                })
            });

            const data = await response.json();

            if (response.ok) {
                setScheduleMessage(data.message || 'Appointment scheduled successfully!');
                setPatientName('');
                setPatientAge('');
                setPatientGender('');
                setPatientContactInfo('');
                setPatientDietaryRestrictions('');
                setPatientAllergies('');
                setAppointmentTime(getDefaultAppointmentTime());
            } else {
                setScheduleMessage(data.message || 'Failed to schedule appointment.');
            }
        } catch (error) {
            console.error('Network error scheduling appointment:', error);
            setScheduleMessage('Network error. Could not schedule appointment.');
        }
    };


    return (
        <div className="container">
            <h1>Staff Dashboard</h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '30px' }}>Welcome, Staff! Manage patient appointments and queue here.</p>

            {staffError && (
                <div className="message error">
                    Error: {staffError}
                </div>
            )}

            {/* Section: Schedule Appointment for Walk-ins */}
            <div className="container" style={{ marginBottom: '40px' }}>
                <h2 className="section-heading">Schedule New Appointment</h2>
                <form onSubmit={handleScheduleAppointment}>
                    {/* Patient Details */}
                    <div className="form-span-2" style={{ fontWeight: 'bold', color: '#666', marginBottom: '5px', marginTop: '10px' }}>Patient Details</div>
                    <div>
                        <label htmlFor="patientName">Name (Required):</label>
                        <input type="text" id="patientName" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="patientAge">Age:</label>
                        <input type="number" id="patientAge" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="patientGender">Gender:</label>
                        <select id="patientGender" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="patientContactInfo">Contact Info:</label>
                        <input type="text" id="patientContactInfo" value={patientContactInfo} onChange={(e) => setPatientContactInfo(e.target.value)} />
                    </div>
                    <div className="form-span-2">
                        <label htmlFor="patientDietaryRestrictions">Dietary Restrictions:</label>
                        <input type="text" id="patientDietaryRestrictions" value={patientDietaryRestrictions} onChange={(e) => setPatientDietaryRestrictions(e.target.value)} />
                    </div>
                    <div className="form-span-2">
                        <label htmlFor="patientAllergies">Allergies:</label>
                        <input type="text" id="patientAllergies" value={patientAllergies} onChange={(e) => setAllergies(e.target.value)} />
                    </div>

                    {/* Appointment Details */}
                    <div className="form-span-2" style={{ fontWeight: 'bold', color: '#666', marginBottom: '5px', marginTop: '15px' }}>Appointment Details</div>
                    <div>
                        <label htmlFor="assignDoctor">Assign Doctor (Required):</label>
                        <select id="assignDoctor" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)} required>
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
                        Schedule Appointment
                    </button>
                </form>
                {scheduleMessage && (
                    <p className={`message ${scheduleMessage.includes('successfully') ? 'success' : 'error'}`}>
                        {scheduleMessage}
                    </p>
                )}
            </div>

            {/* Section: Next 3 in Queue */}
            <div className="container">
                <h2 className="section-heading">Next 3 Patients in Queue</h2>
                {next3InQueue.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777', padding: '20px 0' }}>No patients currently in queue.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Queue No.</th>
                                    <th>Patient Name</th>
                                    <th>Doctor</th>
                                    <th>Specialization</th>
                                </tr>
                            </thead>
                            <tbody>
                                {next3InQueue.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{entry.queue_number}</td>
                                        <td>{entry.patient_name}</td>
                                        <td>{entry.doctor_name}</td>
                                        <td>{entry.specialization}</td>
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

export default StaffDashboard;