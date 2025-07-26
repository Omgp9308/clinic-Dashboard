-- server/config/schema.sql

-- Drop tables if they exist to allow for clean re-creation during development
-- In production, be very careful with DROP TABLE!
DROP TABLE IF EXISTS Queue CASCADE;
DROP TABLE IF EXISTS Appointments CASCADE;
DROP TABLE IF EXISTS Patients CASCADE;
DROP TABLE IF EXISTS Doctors CASCADE;
DROP TABLE IF EXISTS Users CASCADE;

-- 1. Users Table
-- Stores user authentication details and general user information
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Will store bcrypt hashed passwords
    role VARCHAR(50) NOT NULL DEFAULT 'patient', -- 'admin', 'doctor', 'staff', 'patient'
    -- You can add fields like first_name, last_name, phone_number here if they are common to all users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Doctors Table
-- Stores specific details for doctor users
CREATE TABLE Doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES Users(id) ON DELETE CASCADE, -- Links to Users table
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255), -- e.g., phone number, clinic address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients Table
-- Stores specific details for patient users
CREATE TABLE Patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES Users(id) ON DELETE CASCADE, -- Links to Users table (optional, if patient has an account)
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(10), -- 'Male', 'Female', 'Other'
    contact_info VARCHAR(255),
    dietary_restrictions TEXT, -- Can be a longer text field
    allergies TEXT,            -- Can be a longer text field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments Table
-- Stores details about scheduled appointments
CREATE TABLE Appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES Doctors(id) ON DELETE RESTRICT, -- Prevent deleting a doctor if they have appointments
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'in_queue', 'denied'
    reason_for_denial TEXT, -- Only if status is 'denied'
    scheduled_by VARCHAR(50) NOT NULL, -- 'patient' or 'staff'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, appointment_time) -- A doctor typically can't have two appointments at the exact same time
);

-- 5. Queue Table
-- Manages the real-time patient queue for doctors
CREATE TABLE Queue (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER UNIQUE REFERENCES Appointments(id) ON DELETE CASCADE, -- Links to a specific appointment
    doctor_id INTEGER NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES Patients(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL, -- The number in line for that doctor
    status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- 'waiting', 'consulting', 'completed', 'denied'
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add doctor_id to the unique constraint to ensure unique queue numbers per doctor
    UNIQUE(doctor_id, queue_number)
);

-- Indexes for performance (optional but good practice)
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_doctors_user_id ON Doctors(user_id);
CREATE INDEX idx_patients_user_id ON Patients(user_id);
CREATE INDEX idx_appointments_patient_id ON Appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON Appointments(doctor_id);
CREATE INDEX idx_queue_doctor_id_status ON Queue(doctor_id, status);