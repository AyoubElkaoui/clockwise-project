-- Migrations/016_CreateNotificationsTable.sql

-- Notificaties tabel voor alle soorten notificaties
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'timesheet_submitted', 'timesheet_approved', 'timesheet_rejected', 'project_assigned', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'timesheet', 'project', 'vacation', etc.
    related_entity_id INTEGER, -- ID van gerelateerde entity
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexen voor performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Commentaar
COMMENT ON TABLE notifications IS 'Notificaties voor gebruikers (manager en medewerkers)';
COMMENT ON COLUMN notifications.type IS 'Type notificatie: timesheet_submitted, timesheet_approved, timesheet_rejected, project_assigned, vacation_approved, etc.';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type gerelateerde entity: timesheet, project, vacation, etc.';
COMMENT ON COLUMN notifications.related_entity_id IS 'ID van gerelateerde entity in Firebird (bijv. UREN_GC_ID)';
