// client/src/pages/LoginPage.js
import React, { useState } from 'react';

// UPDATED: Dynamically get API_BASE_URL from the browser's current domain
const API_BASE_URL = window.location.origin;

function LoginPage({ onLoginSuccess }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('patient');
    const [specialization, setSpecialization] = useState('');
    const [age, setAge, ] = useState('');
    const [gender, setGender] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [allergies, setAllergies] = useState('');

    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const endpoint = isRegistering ? `${API_BASE_URL}/api/register` : `${API_BASE_URL}/api/login`;
        const method = 'POST';

        let body;
        if (isRegistering) {
            body = { email, password, name, role };
            if (role === 'doctor') {
                body = { ...body, specialization, contactInfo };
            } else if (role === 'patient') {
                body = { ...body, age: patientAge ? parseInt(patientAge, 10) : null, gender, contactInfo, dietaryRestrictions, allergies };
            }
        } else {
            body = { email, password };
        }

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || (isRegistering ? 'Registration successful!' : 'Login successful!'));
                if (!isRegistering) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    onLoginSuccess(data.user);
                } else {
                    setEmail('');
                    setPassword('');
                    setName('');
                    setRole('patient');
                    setSpecialization('');
                    setAge('');
                    setGender('');
                    setContactInfo('');
                    setDietaryRestrictions('');
                    setAllergies('');
                    setIsRegistering(false);
                }
            } else {
                setMessage(data.message || 'An error occurred.');
                console.error('Backend error:', data);
            }
        } catch (error) {
            console.error('Network error:', error);
            setMessage('Network error. Please try again or check server connection.');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '500px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
                {isRegistering ? 'Register New Account' : 'Login'}
            </h2>

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {isRegistering && (
                    <>
                        <div>
                            <label htmlFor="name">Name:</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="role">Role:</label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {role === 'doctor' && (
                            <>
                                <div>
                                    <label htmlFor="specialization">Specialization:</label>
                                    <input
                                        type="text"
                                        id="specialization"
                                        value={specialization}
                                        onChange={(e) => setSpecialization(e.target.value)}
                                        required={role === 'doctor'}
                                    />
                                </div>
                                <div className="form-span-2">
                                    <label htmlFor="contactInfoDoc">Contact Info:</label>
                                    <input
                                        type="text"
                                        id="contactInfoDoc"
                                        value={contactInfo}
                                        onChange={(e) => setContactInfo(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {role === 'patient' && (
                            <>
                                <div>
                                    <label htmlFor="age">Age:</label>
                                    <input
                                        type="number"
                                        id="age"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="gender">Gender:</label>
                                    <select
                                        id="gender"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-span-2">
                                    <label htmlFor="contactInfoPatient">Contact Info:</label>
                                    <input
                                        type="text"
                                        id="contactInfoPatient"
                                        value={contactInfo}
                                        onChange={(e) => setContactInfo(e.target.value)}
                                    />
                                </div>
                                <div className="form-span-2">
                                    <label htmlFor="dietaryRestrictions">Dietary Restrictions:</label>
                                    <input
                                        type="text"
                                        id="dietaryRestrictions"
                                        value={dietaryRestrictions}
                                        onChange={(e) => setDietaryRestrictions(e.target.value)}
                                    />
                                </div>
                                <div className="form-span-2">
                                    <label htmlFor="allergies">Allergies:</label>
                                    <input
                                        type="text"
                                        id="allergies"
                                        value={allergies}
                                        onChange={(e) => setAllergies(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

                <button type="submit" className="btn-primary">
                    {isRegistering ? 'Register' : 'Login'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                {isRegistering ? (
                    <>
                        Already have an account?{' '}
                        <button onClick={() => setIsRegistering(false)} className="btn-inline-link">
                            Login
                        </button>
                    </>
                ) : (
                    <>
                        Don't have an account?{' '}
                        <button onClick={() => setIsRegistering(true)} className="btn-inline-link">
                            Register
                        </button>
                    </>
                )}
            </p>

            {message && (
                <p className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default LoginPage;