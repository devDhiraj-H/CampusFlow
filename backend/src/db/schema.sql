-- CampusFlow Relational Schema with Outbox Pattern & Operations Engine

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Authentication Accounts
CREATE TABLE IF NOT EXISTS auth_account (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Profile
CREATE TABLE IF NOT EXISTS students (
    prn VARCHAR(50) PRIMARY KEY,
    auth_id INTEGER NOT NULL REFERENCES auth_account(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    hosteller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tickets Core Engine
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL' CHECK (category IN ('HOSTEL', 'ACADEMIC', 'MAINTENANCE', 'FINANCE', 'GENERAL')),
    priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    department_routing VARCHAR(100) NOT NULL DEFAULT 'GENERAL_ADMIN',
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sla_breached BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50) NOT NULL,
    assigned_to VARCHAR(100),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ticket Comments / Discussion Thread
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id VARCHAR(100) NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    author_name VARCHAR(255),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ticket Activity & Audit Timeline
CREATE TABLE IF NOT EXISTS ticket_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(sla_deadline, is_sla_breached);
CREATE INDEX IF NOT EXISTS idx_students_auth_id ON students(auth_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activities_ticket_id ON ticket_activities(ticket_id);

-- 6. Transactional Outbox Table for Kafka Event Streaming
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(processed, created_at);
