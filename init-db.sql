-- Database Initialization Script for Attendance & Time Tracking System
-- PostgreSQL 16 Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(50),
    job_title VARCHAR(150),
    role VARCHAR(32) NOT NULL DEFAULT 'employee',
    group_ids JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT TRUE,
    temporary_password_expiry BIGINT,
    password_hash VARCHAR(255) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    member_user_ids JSONB DEFAULT '[]'::jsonb,
    created_at VARCHAR(32) NOT NULL
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    group_ids JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at VARCHAR(32) NOT NULL
);

-- 4. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'regular', 'mission', 'leave', 'special'
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
    date VARCHAR(32) NOT NULL, -- Jalali YYYY/MM/DD
    gregorian_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    leave_type VARCHAR(100),
    special_work_type VARCHAR(100),
    mission_destination VARCHAR(255),
    notes TEXT,
    created_at VARCHAR(32) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device VARCHAR(100),
    login_at VARCHAR(64) NOT NULL,
    last_active_at VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. System Audit Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Registration Requests Table
CREATE TABLE IF NOT EXISTS registration_requests (
    id VARCHAR(64) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    job_title VARCHAR(150),
    requested_at VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending'
);

-- 8. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    organization_name VARCHAR(255) DEFAULT 'شرکت مهندسی و نوآوری داده‌پرداز',
    organization_logo TEXT,
    primary_color VARCHAR(16) DEFAULT '#2563eb',
    secondary_color VARCHAR(16) DEFAULT '#0d9488',
    accent_color VARCHAR(16) DEFAULT '#f59e0b',
    temp_password_expiry_minutes INTEGER DEFAULT 60,
    leave_types JSONB DEFAULT '["مرخصی عادی", "مرخصی استعلاجی", "مرخصی مناسبتی"]'::jsonb,
    special_work_types JSONB DEFAULT '["قطعی برق", "اختلال شبکه و ارتباطات", "تعطیلی اضطراری / شرایط جوی"]'::jsonb,
    blocked_ips JSONB DEFAULT '["192.168.1.99"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_project ON attendance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);

-- Seed Default Admin User: admin / admin (mustChangePassword: true)
INSERT INTO users (
    id, username, email, first_name, last_name, mobile, job_title, role,
    group_ids, is_active, is_archived, must_change_password, password_hash, created_at
) VALUES (
    'usr-admin', 'admin', 'admin@company.local', 'مدیر کل', 'سامانه', '09120000001',
    'مدیریت ارشد فناوری اطلاعات', 'admin', '[]'::jsonb, TRUE, FALSE, TRUE, 'admin', '1405/07/13'
) ON CONFLICT (username) DO NOTHING;

-- Seed Default Settings
INSERT INTO system_settings (id, primary_color, secondary_color, accent_color, temp_password_expiry_minutes)
VALUES (1, '#2563eb', '#0d9488', '#f59e0b', 60)
ON CONFLICT (id) DO NOTHING;
