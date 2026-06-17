-- =============================================================================
-- Clockd v2 — Volledig gereconstrueerd databaseschema
-- Gegenereerd: 2026-06-17
-- Doel: Restore op Neon (PostgreSQL 17)
-- Bron: Gereconstrueerd uit C#-repositories, -controllers en migrations 012-021
-- Gebruik: psql $NEON_URL -f _full_schema_dump.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. users
-- Bevat eigen auth (BCrypt), 2FA-velden, HR-kolommen (018, 019)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                          SERIAL PRIMARY KEY,
    medew_gc_id                 INTEGER NOT NULL,
    username                    VARCHAR NOT NULL UNIQUE,
    password_hash               TEXT NOT NULL,
    email                       VARCHAR,
    role                        VARCHAR DEFAULT 'user',
    first_name                  VARCHAR,
    last_name                   VARCHAR,
    phone                       VARCHAR(50),
    is_active                   BOOLEAN DEFAULT TRUE,
    last_login                  TIMESTAMP,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contract_hours              INTEGER DEFAULT 40,
    vacation_days               INTEGER DEFAULT 25,
    used_vacation_days          INTEGER DEFAULT 0,
    atv_hours_per_week          DECIMAL(4,1) DEFAULT 0,
    disability_percentage       INTEGER DEFAULT 0,
    effective_hours_per_week    DECIMAL(4,1),
    employment_start_date       DATE,
    employment_end_date         DATE,
    hr_notes                    TEXT,
    allowed_tasks               VARCHAR DEFAULT 'BOTH',
    two_factor_enabled          BOOLEAN DEFAULT FALSE,
    two_factor_method           VARCHAR,
    two_factor_secret           TEXT,
    two_factor_email_code       TEXT,
    two_factor_code_expires_at  TIMESTAMP,
    two_factor_backup_codes     TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_medew_gc_id ON users(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ---------------------------------------------------------------------------
-- 2. user_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language  VARCHAR DEFAULT 'nl',
    timezone  VARCHAR DEFAULT 'Europe/Amsterdam',
    theme     VARCHAR DEFAULT 'light'
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ---------------------------------------------------------------------------
-- 3. manager_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manager_assignments (
    id           SERIAL PRIMARY KEY,
    manager_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    active_from  DATE DEFAULT CURRENT_DATE,
    active_until DATE,
    UNIQUE(manager_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_assignments_manager ON manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_employee ON manager_assignments(employee_id);

-- ---------------------------------------------------------------------------
-- 4. time_entries_workflow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries_workflow (
    id                  SERIAL PRIMARY KEY,
    medew_gc_id         INTEGER NOT NULL,
    urenper_gc_id       INTEGER NOT NULL,
    taak_gc_id          INTEGER NOT NULL,
    werk_gc_id          INTEGER,
    datum               DATE NOT NULL,
    aantal              DECIMAL NOT NULL,
    omschrijving        TEXT,
    evening_night_hours DECIMAL DEFAULT 0,
    travel_hours        DECIMAL DEFAULT 0,
    distance_km         DECIMAL DEFAULT 0,
    travel_costs        DECIMAL DEFAULT 0,
    other_expenses      DECIMAL DEFAULT 0,
    status              VARCHAR NOT NULL DEFAULT 'DRAFT',
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    submitted_at        TIMESTAMP,
    reviewed_at         TIMESTAMP,
    reviewed_by         INTEGER,
    rejection_reason    TEXT,
    firebird_gc_id      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tew_medew_gc_id ON time_entries_workflow(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_tew_urenper_gc_id ON time_entries_workflow(urenper_gc_id);
CREATE INDEX IF NOT EXISTS idx_tew_status ON time_entries_workflow(status);
CREATE INDEX IF NOT EXISTS idx_tew_datum ON time_entries_workflow(datum);

-- ---------------------------------------------------------------------------
-- 5. leave_requests_workflow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests_workflow (
    id               SERIAL PRIMARY KEY,
    medew_gc_id      INTEGER NOT NULL,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    taak_gc_id       INTEGER,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    total_hours      DECIMAL,
    description      TEXT,
    status           VARCHAR DEFAULT 'DRAFT',
    created_at       TIMESTAMP DEFAULT NOW(),
    submitted_at     TIMESTAMP,
    reviewed_at      TIMESTAMP,
    reviewed_by      INTEGER,
    rejection_reason TEXT,
    updated_at       TIMESTAMP DEFAULT NOW(),
    firebird_gc_ids  TEXT
);

CREATE INDEX IF NOT EXISTS idx_lrw_medew_gc_id ON leave_requests_workflow(medew_gc_id);
CREATE INDEX IF NOT EXISTS idx_lrw_status ON leave_requests_workflow(status);

-- ---------------------------------------------------------------------------
-- 6. vacation_balance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacation_balance (
    id            SERIAL PRIMARY KEY,
    medew_gc_id   INTEGER NOT NULL,
    year          INTEGER NOT NULL,
    total_hours   DECIMAL DEFAULT 0,
    used_hours    DECIMAL DEFAULT 0,
    pending_hours DECIMAL DEFAULT 0,
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(medew_gc_id, year)
);

CREATE INDEX IF NOT EXISTS idx_vacation_balance_medew_year ON vacation_balance(medew_gc_id, year);

-- ---------------------------------------------------------------------------
-- 7. activities  (legacy — momenteel niet actief via PostgreSQL)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(100),
    title        VARCHAR(255),
    description  TEXT,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- ---------------------------------------------------------------------------
-- 8. activity_recipients  (legacy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_recipients (
    id          SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_read     BOOLEAN DEFAULT FALSE,
    read_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_recipients_user ON activity_recipients(user_id);

-- ---------------------------------------------------------------------------
-- 9. system_settings  (020_CreateSystemSettingsTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

INSERT INTO system_settings (key, value, description) VALUES
    ('require_2fa',            'false', 'Verplicht 2FA voor alle gebruikers'),
    ('session_timeout_minutes','60',    'Sessie timeout in minuten'),
    ('max_login_attempts',     '5',     'Maximum aantal login pogingen voordat account wordt geblokkeerd'),
    ('allow_password_reset',   'true',  'Sta wachtwoord reset via email toe')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. audit_log  (legacy — schema minimaal, niet actief in C#-code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(255),
    table_name VARCHAR(100),
    record_id  INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- 11. user_sessions  (legacy — sessie wordt bijgehouden via JWT in localStorage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token         TEXT NOT NULL,
    ip_address    VARCHAR(45),
    user_agent    TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP,
    last_used_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- ---------------------------------------------------------------------------
-- 12. holidays  (012_CreateHolidaysTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays (
    id              SERIAL PRIMARY KEY,
    holiday_date    DATE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL CHECK (type IN ('national', 'company', 'closed')),
    is_work_allowed BOOLEAN DEFAULT FALSE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    UNIQUE(holiday_date, type)
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);

INSERT INTO holidays (holiday_date, name, type, is_work_allowed, created_by) VALUES
('2026-01-01', 'Nieuwjaarsdag',               'national', false, NULL),
('2026-04-03', 'Goede Vrijdag',               'national', false, NULL),
('2026-04-05', 'Eerste Paasdag',              'national', false, NULL),
('2026-04-06', 'Tweede Paasdag',              'national', false, NULL),
('2026-04-27', 'Koningsdag',                  'national', false, NULL),
('2026-05-05', 'Bevrijdingsdag',              'national', false, NULL),
('2026-05-14', 'Hemelvaartsdag',              'national', false, NULL),
('2026-05-24', 'Eerste Pinksterdag',          'national', false, NULL),
('2026-05-25', 'Tweede Pinksterdag',          'national', false, NULL),
('2026-12-25', 'Eerste Kerstdag',             'national', false, NULL),
('2026-12-26', 'Tweede Kerstdag',             'national', false, NULL),
('2026-03-23', 'Ramadan Begint',              'national', false, NULL),
('2026-04-21', 'Suikerfeest (Eid al-Fitr)',   'national', false, NULL),
('2026-04-22', 'Suikerfeest Dag 2',           'national', false, NULL),
('2026-04-23', 'Suikerfeest Dag 3',           'national', false, NULL),
('2026-06-28', 'Offerfeest (Eid al-Adha)',    'national', false, NULL),
('2026-06-29', 'Offerfeest Dag 2',            'national', false, NULL),
('2026-06-30', 'Offerfeest Dag 3',            'national', false, NULL),
('2026-07-18', 'Islamitisch Nieuwjaar',       'national', false, NULL),
('2026-12-24', 'Kerstavond',                  'national', false, NULL),
('2026-12-31', 'Oudejaarsavond',              'national', false, NULL)
ON CONFLICT (holiday_date, type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. user_projects  (013 + 019)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_projects (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_gc_id   INTEGER NOT NULL,
    assigned_by     INTEGER REFERENCES users(id),
    assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hours_per_week  DECIMAL(4,1),
    notes           TEXT,
    UNIQUE(user_id, project_gc_id)
);

CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_gc_id ON user_projects(project_gc_id);

-- ---------------------------------------------------------------------------
-- 14. periods  (014_CreatePeriodsTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periods (
    gc_id       SERIAL PRIMARY KEY,
    gc_code     VARCHAR(50) NOT NULL UNIQUE,
    begin_datum DATE NOT NULL,
    end_datum   DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(begin_datum, end_datum)
);

CREATE INDEX IF NOT EXISTS idx_periods_begin_datum ON periods(begin_datum);
CREATE INDEX IF NOT EXISTS idx_periods_end_datum   ON periods(end_datum);
CREATE INDEX IF NOT EXISTS idx_periods_gc_code     ON periods(gc_code);

INSERT INTO periods (gc_code, begin_datum, end_datum) VALUES
('2026-W01','2026-01-01','2026-01-07'),('2026-W02','2026-01-08','2026-01-14'),
('2026-W03','2026-01-15','2026-01-21'),('2026-W04','2026-01-22','2026-01-28'),
('2026-W05','2026-01-29','2026-02-04'),('2026-W06','2026-02-05','2026-02-11'),
('2026-W07','2026-02-12','2026-02-18'),('2026-W08','2026-02-19','2026-02-25'),
('2026-W09','2026-02-26','2026-03-04'),('2026-W10','2026-03-05','2026-03-11'),
('2026-W11','2026-03-12','2026-03-18'),('2026-W12','2026-03-19','2026-03-25'),
('2026-W13','2026-03-26','2026-04-01'),('2026-W14','2026-04-02','2026-04-08'),
('2026-W15','2026-04-09','2026-04-15'),('2026-W16','2026-04-16','2026-04-22'),
('2026-W17','2026-04-23','2026-04-29'),('2026-W18','2026-04-30','2026-05-06'),
('2026-W19','2026-05-07','2026-05-13'),('2026-W20','2026-05-14','2026-05-20'),
('2026-W21','2026-05-21','2026-05-27'),('2026-W22','2026-05-28','2026-06-03'),
('2026-W23','2026-06-04','2026-06-10'),('2026-W24','2026-06-11','2026-06-17'),
('2026-W25','2026-06-18','2026-06-24'),('2026-W26','2026-06-25','2026-07-01'),
('2026-W27','2026-07-02','2026-07-08'),('2026-W28','2026-07-09','2026-07-15'),
('2026-W29','2026-07-16','2026-07-22'),('2026-W30','2026-07-23','2026-07-29'),
('2026-W31','2026-07-30','2026-08-05'),('2026-W32','2026-08-06','2026-08-12'),
('2026-W33','2026-08-13','2026-08-19'),('2026-W34','2026-08-20','2026-08-26'),
('2026-W35','2026-08-27','2026-09-02'),('2026-W36','2026-09-03','2026-09-09'),
('2026-W37','2026-09-10','2026-09-16'),('2026-W38','2026-09-17','2026-09-23'),
('2026-W39','2026-09-24','2026-09-30'),('2026-W40','2026-10-01','2026-10-07'),
('2026-W41','2026-10-08','2026-10-14'),('2026-W42','2026-10-15','2026-10-21'),
('2026-W43','2026-10-22','2026-10-28'),('2026-W44','2026-10-29','2026-11-04'),
('2026-W45','2026-11-05','2026-11-11'),('2026-W46','2026-11-12','2026-11-18'),
('2026-W47','2026-11-19','2026-11-25'),('2026-W48','2026-11-26','2026-12-02'),
('2026-W49','2026-12-03','2026-12-09'),('2026-W50','2026-12-10','2026-12-16'),
('2026-W51','2026-12-17','2026-12-23'),('2026-W52','2026-12-24','2026-12-30'),
('2026-W53','2026-12-31','2027-01-06')
ON CONFLICT (gc_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 15. notifications  (016_CreateNotificationsTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id   INTEGER,
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW(),
    read_at             TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type        ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created     ON notifications(created_at DESC);

-- ---------------------------------------------------------------------------
-- 16. favorite_projects  (017_CreateFavoriteProjectsTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorite_projects (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_gc_id  INTEGER NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_gc_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_projects_user_id ON favorite_projects(user_id);

-- ---------------------------------------------------------------------------
-- 17. user_hour_allocations  (021_CreateUserHourAllocationsTable.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_hour_allocations (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_code        VARCHAR(20) NOT NULL,
    task_description VARCHAR(255),
    annual_budget    DECIMAL(10,2) NOT NULL DEFAULT 0,
    used             DECIMAL(10,2) NOT NULL DEFAULT 0,
    year             INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_code, year)
);

CREATE INDEX IF NOT EXISTS idx_user_hour_allocations_user_year ON user_hour_allocations(user_id, year);

-- =============================================================================
-- Schema herstel compleet
-- Tabellen: users, user_settings, manager_assignments, time_entries_workflow,
--           leave_requests_workflow, vacation_balance, activities,
--           activity_recipients, system_settings, audit_log, user_sessions,
--           holidays, user_projects, periods, notifications,
--           favorite_projects, user_hour_allocations
-- =============================================================================
