# Supabase Database Setup Instructions

## Connection Details
- **Host**: `db.ynajasnxfvgtlbjatlbw.supabase.co`
- **Database**: `postgres`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `lG4cRXHLM2gdyZb`

**Connection String**:
```
postgresql://postgres:lG4cRXHLM2gdyZb@db.ynajasnxfvgtlbjatlbw.supabase.co:5432/postgres
```

## Migration Order

Run these SQL migrations in Supabase SQL Editor in this exact order:

### 1. ✅ Already Applied
- `001_CreateWorkflowTables.sql` - Time entries workflow (already exists)

### 2. 🆕 New Migrations to Apply

**Apply in this order:**

1. **002_CreateUsersTables.sql**
   - Creates: `users`, `user_settings`, `manager_assignments`
   - Purpose: Authentication, authorization, user management

2. **003_CreateActivitiesTables.sql**
   - Creates: `activities`, `activity_recipients`
   - Purpose: Notifications and activity tracking

3. **004_CreateLeaveWorkflowTables.sql**
   - Creates: `leave_requests_workflow`, `vacation_balance`
   - Purpose: Leave/vacation request workflow

4. **005_CreateSystemTables.sql**
   - Creates: `system_settings`, `audit_log`, `user_sessions`
   - Purpose: System configuration and audit trail

## How to Apply Migrations in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy contents of migration file
5. Click **Run** or press `Ctrl+Enter`
6. Verify success (should see "Success. No rows returned")
7. Repeat for each migration

## Verify Installation

After running all migrations, verify with:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ `activities`
- ✅ `activity_recipients`
- ✅ `audit_log`
- ✅ `leave_requests_workflow`
- ✅ `manager_assignments`
- ✅ `system_settings`
- ✅ `time_entries_workflow`
- ✅ `user_sessions`
- ✅ `user_settings`
- ✅ `users`
- ✅ `vacation_balance`

## Initial Data Setup

### Create First Admin User

```sql
-- Insert admin user (linked to Firebird medew_gc_id = 100001)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100001,  -- Your Firebird AT_MEDEW.GC_ID
    'admin',
    '$2a$11$HASH_HERE',  -- Use BCrypt to hash 'admin123' or your password
    'admin@example.com',
    'admin',
    'Admin',
    'User',
    TRUE
);

-- Create default settings for admin
INSERT INTO user_settings (user_id, language, timezone, theme)
VALUES (1, 'nl', 'Europe/Amsterdam', 'light');
```

### Create Test User

```sql
-- Insert test user (linked to Firebird medew_gc_id = 100050)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100050,  -- Rahakbauw K from your Firebird DB
    'rahakbauw',
    '$2a$11$HASH_HERE',  -- Use BCrypt to hash password
    'rahakbauw@example.com',
    'user',
    'Rahakbauw',
    'K',
    TRUE
);

-- Create default settings
INSERT INTO user_settings (user_id, language, timezone, theme)
VALUES (2, 'nl', 'Europe/Amsterdam', 'light');
```

## Connection String for Backend

Update your `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=db.ynajasnxfvgtlbjatlbw.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=lG4cRXHLM2gdyZb;SSL Mode=Require;Trust Server Certificate=true",
    "Firebird": "your-existing-firebird-connection-string"
  }
}
```

## Architecture Overview

```
┌──────────────────────────────────────┐
│     Your Web Application             │
└───────────┬──────────────┬───────────┘
            │              │
    ┌───────▼──────┐  ┌───▼──────────────────┐
    │  Supabase    │  │  Firebird Atrium DB  │
    │  PostgreSQL  │  │  (Production)        │
    │              │  │                      │
    │ • users      │  │ • AT_MEDEW          │
    │ • workflow   │  │ • AT_TAAK           │
    │ • activities │  │ • AT_URENBREG       │
    │ • settings   │  │ • AT_WERK           │
    └──────────────┘  └──────────────────────┘
    (Read/Write)       (Mostly Read-Only)
```

## Security Notes

⚠️ **Important**:
1. Never commit connection strings to Git
2. Use environment variables in production
3. Enable Row Level Security (RLS) in Supabase for production
4. Rotate database password regularly
5. Use SSL connections only

## Troubleshooting

### Connection Issues
```bash
# Test connection from command line
psql "postgresql://postgres:lG4cRXHLM2gdyZb@db.ynajasnxfvgtlbjatlbw.supabase.co:5432/postgres?sslmode=require"
```

### Check Migration Status
```sql
-- See all tables
\dt

-- Count records in key tables
SELECT
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM activities) as activities_count,
    (SELECT COUNT(*) FROM time_entries_workflow) as time_entries_count;
```
