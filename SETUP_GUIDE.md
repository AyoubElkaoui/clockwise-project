# Clockwise Setup Guide - PostgreSQL + Firebird Hybrid

## 🎯 Architectuur Overzicht

```
┌──────────────────────────────────────┐
│     Web Applicatie (Next.js)        │
└───────────┬──────────────┬───────────┘
            │              │
    ┌───────▼──────┐  ┌───▼──────────────────┐
    │  Supabase    │  │  Firebird Atrium DB  │
    │  PostgreSQL  │  │  (Production)        │
    │              │  │                      │
    │ • Users/Auth │  │ • AT_MEDEW          │
    │ • Workflow   │  │ • AT_TAAK           │
    │ • Activities │  │ • AT_URENBREG       │
    │ • Settings   │  │ • AT_WERK           │
    └──────────────┘  └──────────────────────┘
    (Read/Write)       (Read + Write approved)
```

## 📋 Stap 1: Supabase Database Setup

### 1.1 Login naar Supabase
- Ga naar: https://app.supabase.com
- Selecteer je project
- Ga naar **SQL Editor** in het linker menu

### 1.2 Run Migrations (in volgorde!)

Kopieer en run elke SQL file in Supabase SQL Editor:

```bash
1. backend/Migrations/002_CreateUsersTables.sql
2. backend/Migrations/003_CreateActivitiesTables.sql
3. backend/Migrations/004_CreateLeaveWorkflowTables.sql
4. backend/Migrations/005_CreateSystemTables.sql
```

**Na elke file**: Klik "Run" en check of er geen errors zijn.

### 1.3 Verify Tables

Run dit in SQL Editor om te checken of alles er is:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
```

Je zou moeten zien:
- activities
- activity_recipients
- audit_log
- leave_requests_workflow
- manager_assignments
- system_settings
- time_entries_workflow
- user_sessions
- user_settings
- users
- vacation_balance

## 📋 Stap 2: Test Users Aanmaken

### 2.1 Start de Backend

```bash
cd backend
dotnet run
```

Backend draait nu op: http://localhost:5000

### 2.2 Generate Password Hashes

Open een nieuwe terminal en hash de passwords:

```bash
# Hash voor admin (password: admin123)
curl -X POST http://localhost:5000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"admin123\"}"

# Hash voor user (password: user123)
curl -X POST http://localhost:5000/api/auth/hash-password \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"user123\"}"
```

Kopieer de `password_hash` values uit de responses.

### 2.3 Create Users in Supabase

Ga naar Supabase SQL Editor en run:

```sql
-- Admin user
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100001,  -- Moet matchen met AT_MEDEW.GC_ID in Firebird!
    'admin',
    'PASTE_HASH_HERE',  -- Plak hier de hash van stap 2.2
    'admin@company.com',
    'admin',
    'Admin',
    'User',
    TRUE
);

-- Regular user (Rahakbauw K from Firebird)
INSERT INTO users (medew_gc_id, username, password_hash, email, role, first_name, last_name, is_active)
VALUES (
    100050,  -- Moet matchen met AT_MEDEW.GC_ID in Firebird!
    'rahakbauw',
    'PASTE_HASH_HERE',  -- Plak hier de hash van stap 2.2
    'rahakbauw@company.com',
    'user',
    'Rahakbauw',
    'K',
    TRUE
);

-- Create default settings
INSERT INTO user_settings (user_id, language, timezone, theme)
SELECT id, 'nl', 'Europe/Amsterdam', 'light'
FROM users;
```

### 2.4 Verify Users

```sql
SELECT id, medew_gc_id, username, role, email, is_active
FROM users;
```

## 📋 Stap 3: Test de Login

### 3.1 Test via cURL

```bash
# Login als admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"admin\", \"password\": \"admin123\"}"

# Login als user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"rahakbauw\", \"password\": \"user123\"}"
```

Verwachte response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "medew_gc_id": 100001,
    "email": "admin@company.com",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

### 3.2 Test Leave Booking

Nu kun je leave boeken met de API:

```bash
# Eerst login om token te krijgen
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"rahakbauw\", \"password\": \"user123\"}" \
  | jq -r '.token')

# Book leave
curl -X POST http://localhost:5000/api/leave/book \
  -H "Content-Type: application/json" \
  -H "X-MEDEW-GC-ID: 100050" \
  -d "{
    \"taskId\": 100009,
    \"dates\": [\"2025-12-26\", \"2025-12-27\"],
    \"hoursPerDay\": 8,
    \"description\": \"Kerstvakantie\"
  }"
```

## 📋 Stap 4: Frontend Connectie

### 4.1 Update Frontend API calls

De frontend moet nu het nieuwe `/api/auth/login` endpoint gebruiken:

```typescript
// frontend/lib/api.ts
export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();

  // Store in localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('medewGcId', data.user.medew_gc_id);
  localStorage.setItem('role', data.user.role);
  localStorage.setItem('firstName', data.user.first_name);
  localStorage.setItem('lastName', data.user.last_name);

  return data;
}
```

## 🧪 Test Checklist

- [ ] Supabase migrations success
- [ ] Users table heeft 2 users
- [ ] Backend start zonder errors
- [ ] Login API werkt (curl test)
- [ ] JWT token wordt gegenereerd
- [ ] Leave booking werkt
- [ ] Data verschijnt in Firebird AT_URENBREG

## 🔧 Troubleshooting

### Database Connection Errors

Check je connection strings in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=db.ynajasnxfvgtlbjatlbw.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=lG4cRXHLM2gdyZb;SSL Mode=Require;Trust Server Certificate=true",
    "Firebird": "DataSource=C:\\ProgramData\\Syntess\\AtriumData\\Databases\\TST\\ATRIUM.FDB;User=SYSDBA;Password=masterkey;Dialect=3;Charset=UTF8;ServerType=0"
  }
}
```

### "Invalid username or password"

- Check of user bestaat in Supabase `users` table
- Check of `is_active = TRUE`
- Check of password hash correct is (regenerate met `/api/auth/hash-password`)

### "Missing X-MEDEW-GC-ID header"

- Login endpoint heeft GEEN X-MEDEW-GC-ID header nodig
- Andere endpoints WEL
- Frontend moet header meesturen na login

## 🎉 Success!

Als alles werkt:
1. ✅ Je kunt inloggen met username/password (PostgreSQL)
2. ✅ Leave booking INSERT data in Firebird
3. ✅ Notificaties worden getrackt in PostgreSQL
4. ✅ Workflow statussen in PostgreSQL
5. ✅ Atrium DB blijft "source of truth" voor goedgekeurde data

## 📞 Support

Problemen? Check:
1. Supabase logs (Dashboard → Logs)
2. Backend console output
3. Browser DevTools Network tab
4. DBeaver om direct in databases te kijken
