# MIGRATION_AUDIT.md — Clockd v2 → Neon

**Datum audit:** 2026-06-17  
**Auditor:** Claude Sonnet 4.6 (pure read-only analyse, geen wijzigingen)

---

## EXECUTIVE SUMMARY

De migratie van Supabase naar Neon is **triviaal**. Supabase wordt uitsluitend gebruikt als een gehoste PostgreSQL-instantie. Er zijn **nul** Supabase-specifieke SDKs, packages, Auth-features, RLS-policies, Storage-buckets of Realtime-subscriptions in de codebase. De volledige migratie bestaat uit één connectionstring wijzigen in `appsettings.json` (en eventueel in CI/secrets).

---

## 1. STACK

### Next.js / Frontend
| Eigenschap | Waarde |
|---|---|
| Framework | Next.js 15.5.9 |
| Router | App Router (map `/frontend/app/`) |
| TypeScript | Ja |
| Package manager | npm (package-lock.json aanwezig) |
| Deploy target | Vercel (`.vercel/project.json` aanwezig) |
| Runtime | Node.js (runtime="nodejs" in API route) |

### Backend
| Eigenschap | Waarde |
|---|---|
| Framework | ASP.NET Core 8 Web API (C#) |
| Deploy target | Render (render.yaml, Docker) |
| ORM/DB-laag | **Dapper** (raw SQL) + Npgsql 8.0.4 voor PostgreSQL |
| Firebird | FirebirdSql.Data.FirebirdClient 9.1.1 |
| Auth | Eigen BCrypt + JWT (System.IdentityModel.Tokens.Jwt 7.6.0) |
| 2FA | Otp.NET 1.4.0 (TOTP) + MailKit 4.3.0 (email codes) |

### Relevante dependencies (frontend/package.json)
```
next: ^15.5.9
react: ^19.0.0
typescript: ^5
axios: ^1.7.9
@tanstack/react-query: ^5.90.5
zustand: ^5.0.8
tailwindcss: ^3.4.1
daisyui: ^4.12.23
@radix-ui/* (checkbox, dialog, dropdown-menu, progress, select, switch, tabs)
lucide-react: ^0.548.0
framer-motion: ^12.23.24
recharts: ^3.3.0
react-hook-form: ^7.65.0
zod: ^4.1.12
date-fns: ^4.1.0
dayjs: ^1.11.13
i18next + react-i18next
exceljs + jspdf + jspdf-autotable
```
**Geen @supabase/* packages. Nul.**

### Relevante dependencies (backend/backend.csproj)
```
Dapper 2.1.35
Npgsql 8.0.4
FirebirdSql.Data.FirebirdClient 9.1.1
BCrypt.Net-Next 4.0.3
System.IdentityModel.Tokens.Jwt 7.6.0
Otp.NET 1.4.0
MailKit 4.3.0
Microsoft.EntityFrameworkCore 9.0.4  ← GEÏNSTALLEERD MAAR UITGESCHAKELD
QRCoder 1.4.3
Swashbuckle.AspNetCore 6.6.2
```

---

## 2. SUPABASE-AFHANKELIJKHEDEN

### Auth
**NEE — de app gebruikt Supabase Auth NIET.**

De app heeft een volledig eigen authenticatielaag:
- Login: `POST /api/auth/login` → verifieert username + BCrypt password hash uit `users` tabel
- Sessie: JWT token gegenereerd door `AuthenticationService.cs:76` (7 dagen geldig)
- Middleware: custom `MedewGcIdMiddleware` in `Program.cs:173` die `X-MEDEW-GC-ID` header valideert
- 2FA: eigen TOTP (Otp.NET) + email code flow
- Client-side state: JWT + user data opgeslagen in `localStorage` (geen cookies/sessies)

Vindplaatsen auth-logica:
- `backend/Services/AuthenticationService.cs` — BCrypt verify + JWT generatie
- `backend/Services/TwoFactorService.cs` — TOTP + email codes
- `backend/Controllers/AuthController.cs` — `/api/auth/login`, `/api/auth/me`
- `backend/Repositories/PostgreSQLUserRepository.cs` — user lookups via Dapper
- `frontend/lib/auth-utils.ts` — localStorage helpers (userId, medewGcId, userRank)
- `frontend/api/auth.ts:4` — POST naar `/api/auth/login`
- `frontend/lib/api.ts:20-36` — axios interceptor voegt X-MEDEW-GC-ID + X-User-ID headers toe

### Database
**JA — Supabase PostgreSQL wordt gebruikt, maar puur als een gewone Postgres-server.**

De backend gebruikt Npgsql + Dapper om raw SQL queries uit te voeren. Er is **geen** Supabase client library (`@supabase/supabase-js`, PostgREST, etc.).

Alle PostgreSQL writes/reads:
- `backend/Repositories/PostgresWorkflowRepository.cs` — alle CRUD op `time_entries_workflow`
- `backend/Repositories/PostgreSQLUserRepository.cs` — user lookups en aanmaken
- `backend/Repositories/PostgresLeaveRepository.cs` — CRUD op `leave_requests_workflow`
- `backend/Repositories/NotificationRepository.cs` — CRUD op `notifications`
- `backend/Services/WorkflowService.cs:571-671` — INSERT in PostgreSQL én vervolgens INSERT in Firebird bij approval
- `backend/Controllers/AuthController.cs:53-164` — directe NpgsqlConnection voor 2FA logica
- `backend/Controllers/WorkflowController.cs:191-232` — directe NpgsqlConnection voor notificatie bij submit
- `backend/Data/PostgreSQLConnectionFactory.cs` — connectionstring wrapper

Verbinding:
```
Host=aws-1-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;
Username=postgres.ynajasnxfvgtlbjatlbw;Password=***;SSL Mode=Require;Trust Server Certificate=true
```

### RLS (Row Level Security)
**NEE — RLS is NIET actief.**

- De setup-gids (`Migrations/000_SUPABASE_SETUP.md:158`) raadt aan RLS te activeren: *"Enable Row Level Security (RLS) in Supabase for production"*
- Er bestaan **nul** `CREATE POLICY` of `ENABLE ROW LEVEL SECURITY` statements in de migraties
- `Migrations/020_CreateSystemSettingsTable.sql:25-26` bevat `GRANT ALL ON system_settings TO authenticated; GRANT ALL ON system_settings TO anon;` — dit zijn Supabase-rol-conventies die niets doen als de app de service_role of directe Postgres-connectie gebruikt
- Security wordt in de app zelf afgedwongen door headers (`X-MEDEW-GC-ID`, `X-USER-ROLE`) en server-side checks

### Storage
**NEE** — geen `supabase.storage` referenties. Geen file uploads in de codebase.

### Realtime
**NEE** — geen `supabase.channel()`, geen WebSocket subscriptions, geen realtime.

### Edge Functions / Database Functions / Triggers
**NEE** — geen Supabase Edge Functions, geen `supabase.functions.invoke()`. De MigrationRunner (`backend/MigrationRunner.cs`) runt raw SQL DDL-statements via Npgsql.

---

## 3. DATABASESCHEMA

### Opmerking over naamgeving
**De tabellen hebben GEEN `cv2_` prefix.** De tabel namen zijn plain (users, time_entries_workflow, etc.). Het vermoeden dat tabellen `cv2_` prefix hadden, klopt niet voor de huidige staat van de database.

### Opmerking over missende migratie-SQL
Migraties 001 t/m 011 zijn **niet aanwezig in de repo** — alleen de setup-gids (`000_SUPABASE_SETUP.md`) verwijst ernaar. Ze zijn blijkbaar direct in de Supabase SQL editor uitgevoerd. Aanwezig zijn: 012 t/m 021.

De schema's van de "missende" tabellen zijn hieronder gereconstrueerd uit de C#-models en SQL queries in de repositories.

---

### Tabel: `users`
Aangemaakt door: `002_CreateUsersTables.sql` (niet in repo)  
Uitgebreid door: `018_AddUserManagementColumns.sql`, `019_AddEmployeeManagementColumns.sql`  
Gereconstrueerd uit: `PostgreSQLUserRepository.cs`, `AuthController.cs`, `WorkflowService.cs`

```sql
CREATE TABLE users (
    id                        SERIAL PRIMARY KEY,
    medew_gc_id               INTEGER NOT NULL,          -- FK naar Firebird AT_MEDEW.GC_ID
    username                  VARCHAR NOT NULL UNIQUE,
    password_hash             TEXT NOT NULL,
    email                     VARCHAR,
    role                      VARCHAR DEFAULT 'user',    -- 'admin', 'manager', 'user'
    first_name                VARCHAR,
    last_name                 VARCHAR,
    phone                     VARCHAR(50),               -- added 018
    is_active                 BOOLEAN DEFAULT TRUE,
    last_login                TIMESTAMP,
    created_at                TIMESTAMP DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- added 018
    contract_hours            INTEGER DEFAULT 40,         -- added 018
    vacation_days             INTEGER DEFAULT 25,         -- added 018
    used_vacation_days        INTEGER DEFAULT 0,          -- added 018
    atv_hours_per_week        DECIMAL(4,1) DEFAULT 0,    -- added 019
    disability_percentage     INTEGER DEFAULT 0,          -- added 019
    effective_hours_per_week  DECIMAL(4,1),               -- added 019
    employment_start_date     DATE,                       -- added 019
    employment_end_date       DATE,                       -- added 019
    hr_notes                  TEXT,                       -- added 019
    allowed_tasks             VARCHAR DEFAULT 'BOTH',     -- BOTH / MONTAGE_ONLY / TEKENKAMER_ONLY
    -- 2FA kolommen (toegevoegd via onbekende migratie):
    two_factor_enabled        BOOLEAN DEFAULT FALSE,
    two_factor_method         VARCHAR,                    -- 'totp' of 'email'
    two_factor_secret         TEXT,                       -- encrypted TOTP secret
    two_factor_email_code     TEXT,
    two_factor_code_expires_at TIMESTAMP,
    two_factor_backup_codes   TEXT                        -- JSON array of backup codes
);
```
**Verwijst naar auth.users: NEE** — dit is een volledig eigen users tabel, niet gekoppeld aan Supabase Auth.

---

### Tabel: `user_settings`
Aangemaakt door: `002_CreateUsersTables.sql` (niet in repo)

```sql
CREATE TABLE user_settings (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language  VARCHAR,          -- 'nl', 'en'
    timezone  VARCHAR,          -- 'Europe/Amsterdam'
    theme     VARCHAR           -- 'light', 'dark'
);
```

---

### Tabel: `manager_assignments`
Aangemaakt door: `002_CreateUsersTables.sql` (niet in repo)  
Gereconstrueerd uit: `PostgresWorkflowRepository.cs:147-156`

```sql
CREATE TABLE manager_assignments (
    id          SERIAL PRIMARY KEY,
    manager_id  INTEGER REFERENCES users(id),
    employee_id INTEGER REFERENCES users(id),
    active_until DATE                       -- NULL = onbeperkt
);
```
Relatie: de manager-medewerker koppeling. Bepaalt wie welke timesheets kan reviewen.

---

### Tabel: `time_entries_workflow`
Aangemaakt door: `001_CreateWorkflowTables.sql` (niet in repo)  
Gereconstrueerd uit: `WorkflowModels.cs`, `PostgresWorkflowRepository.cs`

```sql
CREATE TABLE time_entries_workflow (
    id                  SERIAL PRIMARY KEY,
    medew_gc_id         INTEGER NOT NULL,       -- FK naar Firebird AT_MEDEW.GC_ID
    urenper_gc_id       INTEGER NOT NULL,       -- FK naar Firebird AT_URENPER.GC_ID (periode)
    taak_gc_id          INTEGER NOT NULL,       -- FK naar Firebird AT_TAAK.GC_ID (taakcode)
    werk_gc_id          INTEGER,                -- FK naar Firebird AT_WERK.GC_ID (project), nullable
    datum               DATE NOT NULL,
    aantal              DECIMAL NOT NULL,       -- uren
    omschrijving        TEXT,
    evening_night_hours DECIMAL DEFAULT 0,
    travel_hours        DECIMAL DEFAULT 0,
    distance_km         DECIMAL DEFAULT 0,
    travel_costs        DECIMAL DEFAULT 0,
    other_expenses      DECIMAL DEFAULT 0,
    status              VARCHAR NOT NULL DEFAULT 'DRAFT',  -- DRAFT/SUBMITTED/APPROVED/REJECTED
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    submitted_at        TIMESTAMP,
    reviewed_at         TIMESTAMP,
    reviewed_by         INTEGER,                -- medew_gc_id van de reviewende manager
    rejection_reason    TEXT,
    firebird_gc_id      INTEGER                 -- gezet bij APPROVED, = Firebird document GC_ID
);
```

---

### Tabel: `leave_requests_workflow`
Aangemaakt door: `004_CreateLeaveWorkflowTables.sql` (niet in repo)  
Gereconstrueerd uit: `PostgresLeaveRepository.cs`

```sql
CREATE TABLE leave_requests_workflow (
    id               SERIAL PRIMARY KEY,
    medew_gc_id      INTEGER NOT NULL,       -- FK naar Firebird AT_MEDEW.GC_ID
    user_id          INTEGER REFERENCES users(id),
    taak_gc_id       INTEGER,                -- FK naar Firebird taakcode (bijv. 100256 voor verlof)
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    total_hours      DECIMAL,                -- uren (TotalDays * 8 bij opslaan)
    description      TEXT,
    status           VARCHAR DEFAULT 'DRAFT',
    created_at       TIMESTAMP DEFAULT NOW(),
    submitted_at     TIMESTAMP,
    reviewed_at      TIMESTAMP,
    reviewed_by      INTEGER,
    rejection_reason TEXT,
    updated_at       TIMESTAMP DEFAULT NOW(),
    firebird_gc_ids  TEXT                    -- komma-gescheiden Firebird GC IDs bij goedkeuring
);
```

---

### Tabel: `vacation_balance`
Aangemaakt door: `004_CreateLeaveWorkflowTables.sql` (niet in repo)  
Schema: **OPEN VRAAG** — geen SQL-bestand aanwezig, geen queries gevonden in de codebase.

---

### Tabel: `activities`
Aangemaakt door: `003_CreateActivitiesTables.sql` (niet in repo)  
Schema: **OPEN VRAAG** — geen SQL-bestand. Wel een `ActivityService.cs` maar die is niet grondig onderzocht op table-kolommen.

### Tabel: `activity_recipients`
Aangemaakt door: `003_CreateActivitiesTables.sql` (niet in repo)  
Schema: **OPEN VRAAG** — zie above.

---

### Tabel: `system_settings`
Aangemaakt door: `backend/Migrations/020_CreateSystemSettingsTable.sql`

```sql
CREATE TABLE system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Default records:
-- ('require_2fa', 'false', ...)
-- ('session_timeout_minutes', '60', ...)
-- ('max_login_attempts', '5', ...)
-- ('allow_password_reset', 'true', ...)
```

---

### Tabel: `audit_log`
Aangemaakt door: `005_CreateSystemTables.sql` (niet in repo)  
Schema: **OPEN VRAAG**

### Tabel: `user_sessions`
Aangemaakt door: `005_CreateSystemTables.sql` (niet in repo)  
Schema: **OPEN VRAAG** — opvallend: de frontend slaat sessies op in localStorage, dus deze tabel wordt waarschijnlijk niet actief gebruikt.

---

### Tabel: `holidays`
Aangemaakt door: `backend/Migrations/012_CreateHolidaysTable.sql`

```sql
CREATE TABLE holidays (
    id             SERIAL PRIMARY KEY,
    holiday_date   DATE NOT NULL,
    name           VARCHAR(255) NOT NULL,
    type           VARCHAR(50) NOT NULL CHECK (type IN ('national', 'company', 'closed')),
    is_work_allowed BOOLEAN DEFAULT FALSE,
    created_by     INTEGER REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT NOW(),
    notes          TEXT,
    UNIQUE(holiday_date, type)
);
```

---

### Tabel: `user_projects`
Aangemaakt door: `backend/Migrations/013_CreateUserProjectsTable.sql`  
Uitgebreid door: `019_AddEmployeeManagementColumns.sql`

```sql
CREATE TABLE user_projects (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_gc_id   INTEGER NOT NULL,   -- FK naar Firebird AT_WERK.GC_ID
    assigned_by     INTEGER REFERENCES users(id),
    assigned_at     TIMESTAMP DEFAULT NOW(),
    hours_per_week  DECIMAL(4,1),       -- added 019
    notes           TEXT,               -- added 019
    UNIQUE(user_id, project_gc_id)
);
```

---

### Tabel: `periods`
Aangemaakt door: `backend/Migrations/014_CreatePeriodsTable.sql`

```sql
CREATE TABLE periods (
    gc_id       SERIAL PRIMARY KEY,
    gc_code     VARCHAR(50) NOT NULL UNIQUE,   -- bijv. '2026-W01'
    begin_datum DATE NOT NULL,
    end_datum   DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(begin_datum, end_datum)
);
-- Pre-filled: wekelijkse periodes voor 2026 (W01–W53)
```

---

### Tabel: `notifications`
Aangemaakt door: `backend/Migrations/016_CreateNotificationsTable.sql`

```sql
CREATE TABLE notifications (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(50) NOT NULL,    -- 'timesheet_submitted', 'timesheet_approved', etc.
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    related_entity_type VARCHAR(50),             -- 'timesheet', 'project', 'vacation', etc.
    related_entity_id   INTEGER,
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW(),
    read_at             TIMESTAMP
);
```

---

### Tabel: `favorite_projects`
Aangemaakt door: `backend/Migrations/017_CreateFavoriteProjectsTable.sql`

```sql
CREATE TABLE favorite_projects (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_gc_id  INTEGER NOT NULL,    -- FK naar Firebird AT_WERK.GC_ID
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_gc_id)
);
```

---

### Tabel: `user_hour_allocations`
Aangemaakt door: `backend/Migrations/021_CreateUserHourAllocationsTable.sql`

```sql
CREATE TABLE user_hour_allocations (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_code        VARCHAR(20) NOT NULL,    -- bijv. 'Z03', 'Z04', 'I02', 'SLEEFTIJD'
    task_description VARCHAR(255),
    annual_budget    DECIMAL(10,2) NOT NULL DEFAULT 0,
    used             DECIMAL(10,2) NOT NULL DEFAULT 0,
    year             INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, task_code, year)
);
```

---

### Relatiediagram

```
users (PostgreSQL)
├── id  ←── medew_gc_id ──→ AT_MEDEW.GC_ID (Firebird, read-only)
│
├── user_settings.user_id
├── manager_assignments.manager_id / .employee_id
├── user_projects.user_id
├── user_hour_allocations.user_id
├── notifications.user_id
├── favorite_projects.user_id
├── holidays.created_by
├── leave_requests_workflow.user_id  (ook .medew_gc_id → users.medew_gc_id)
│
time_entries_workflow
├── medew_gc_id ──→ AT_MEDEW.GC_ID (Firebird)
├── urenper_gc_id ──→ AT_URENPER.GC_ID (Firebird)
├── taak_gc_id ──→ AT_TAAK.GC_ID (Firebird)
├── werk_gc_id ──→ AT_WERK.GC_ID (Firebird)
└── firebird_gc_id ──→ AT_URENBREG.GC_ID (Firebird, gezet bij APPROVED)

user_projects
├── user_id → users.id
└── project_gc_id ──→ AT_WERK.GC_ID (Firebird)

favorite_projects
├── user_id → users.id
└── project_gc_id ──→ AT_WERK.GC_ID (Firebird)

periods
└── gc_id ──→ kan matchen met AT_URENPER.GC_ID (Firebird, parallel bijgehouden)
```

**Verwijst iets naar `auth.users`?** NEE. Geen enkele tabel verwijst naar Supabase Auth.

---

### Aantal rijen per tabel (schatting)
Geen directe databasetoegang beschikbaar — schattingen op basis van de setup docs en business context:

| Tabel | Orde van grootte | Basis voor schatting |
|---|---|---|
| users | ~10–100 | Kleine organisatie, ~25-50 medewerkers |
| manager_assignments | ~10–50 | 1-5 managers × medewerkers |
| time_entries_workflow | ~1.000–50.000 | Dagelijks gebruik, meerdere maanden |
| leave_requests_workflow | ~100–500 | Per medewerker jaarlijks een paar |
| notifications | ~100–2.000 | Per workflow-actie |
| user_projects | ~100–1.000 | Projecttoewijzingen |
| favorite_projects | ~50–500 | Per user een paar favorieten |
| periods | 53 | Hardcoded in migratie (2026-W01 t/m W53) |
| holidays | ~30 | Hardcoded in migratie |
| system_settings | 4 | Hardcoded in migratie |
| user_hour_allocations | ~100–500 | Per user per taakcode per jaar |
| user_settings | ~10–100 | 1:1 met users |

---

## 4. INTEGRATIES

### Clockwise OAuth flow
**BESTAAT NIET in de codebase.**

Er is geen OAuth-integratie met de Clockwise kalendertool (clockwise.app). De naam "Clockwise-project" / "Clockd" is de projectnaam van de applicatie zelf, niet een integratie. Er zijn geen OAuth tokens, geen callback endpoints, geen token refresh logic voor externe services.

Open vraag: bedoelde u in de promptbeschrijving iets anders met "Clockwise OAuth"? Zo ja, dan is dit een toekomstige feature die nog niet bestaat.

### Syntess Atrium Firebird — writes
De Firebird database (`AT_URENBREG`, `AT_MEDEW`, etc.) is de Syntess Atrium ERP-database. Deze is overwegend **read-only** voor de app, met één cruciale schrijfoperatie:

**Write-pad (bij timesheet goedkeuring):**
```
WorkflowController.ReviewEntries (POST /api/workflow/review)
  → WorkflowService.ReviewEntriesAsync()
    → WorkflowService.InsertIntoFirebirdAsync()          ← CRITICAL PATH
      → FirebirdDataRepository.GetDocumentGcIdAsync()   – zoek bestaand document
      → FirebirdDataRepository.CreateDocumentAsync()    – maak document aan als nodig
      → FirebirdDataRepository.EnsureUrenstatAsync()    – zorg voor urenstat record
      → FirebirdDataRepository.GetNextRegelNrAsync()    – volgnummer
      → FirebirdDataRepository.InsertTimeEntryAsync()   – INSERT in AT_URENBREG
      → UPDATE PostgreSQL time_entries_workflow.firebird_gc_id = result
```

Dit alles gebeurt in een Firebird-transactie (`BeginTransactionAsync` → `CommitAsync` / `RollbackAsync`).

Locaties:
- `backend/Services/WorkflowService.cs:599-671` — `InsertIntoFirebirdAsync()`
- `backend/Repositories/FirebirdDataRepository.cs` — alle Firebird lees/schrijf operaties
- `backend/Repositories/FirebirdTimeEntryRepository.cs:165` — `INSERT INTO AT_URENBREG`

**Losgekoppeld van Supabase?** Ja, volledig. De Firebird-write is onafhankelijk van de PostgreSQL-verbinding. De data wordt eerst opgeslagen in PostgreSQL (als DRAFT/SUBMITTED), en pas bij APPROVED door de manager geschreven naar Firebird. De PostgreSQL connectionstring hoeft alleen gewijzigd te worden.

### 5-stap approval workflow

De workflow heeft **4 statussen** (geen 5):

| Status | Betekenis | Actor |
|---|---|---|
| `DRAFT` | Medewerker heeft uren ingevoerd, nog bewerkbaar | Medewerker |
| `SUBMITTED` | Ingediend voor review, niet meer bewerkbaar | Medewerker |
| `APPROVED` | Goedgekeurd, overgezet naar Firebird | Manager |
| `REJECTED` | Afgekeurd, medewerker moet herzien | Manager |

**Flow:**
```
1. Medewerker slaat uren op als DRAFT    → POST /api/workflow/draft
2. Medewerker dient in                   → POST /api/workflow/submit
   ↓ Notificatie naar manager (notifications tabel)
3. Manager bekijkt ingediende uren       → GET /api/workflow/review/pending
4a. Manager keurt goed (APPROVED)        → POST /api/workflow/review {approve: true}
    ↓ INSERT in Firebird AT_URENBREG
    ↓ UPDATE user_hour_allocations.used
4b. Manager keurt af (REJECTED)          → POST /api/workflow/review {approve: false, rejectionReason: "..."}
5. Bij afkeur: medewerker herziet en     → (bewerk DRAFT) + POST /api/workflow/resubmit
   dient opnieuw in
```

Businesslogica locaties:
- `backend/Services/WorkflowService.cs` — centrale orchestratie
- `backend/Repositories/PostgresWorkflowRepository.cs` — datalag
- `backend/Controllers/WorkflowController.cs` — HTTP endpoints

Autorisatie: header-gebaseerd (`X-USER-ROLE: manager` check in controller). Geen database-level security.

---

## 5. ENV VARS

Alle env vars gevonden in code, gegroepeerd per categorie.

### PostgreSQL / Supabase → te vervangen door Neon
| Var | Gevonden in | Waarde (aard) |
|---|---|---|
| `ConnectionStrings__PostgreSQL` | `appsettings.json`, `appsettings.Development.json`, `docker-compose.yml` | Supabase pooler connection string |

### Firebird
| Var | Gevonden in |
|---|---|
| `ConnectionStrings__Firebird` | `appsettings.json`, `appsettings.Development.json`, `docker-compose.yml` |
| `ConnectionStrings__Firebird` (docker) | `docker-compose.yml` als `ConnectionStrings__Firebird=Database=firebird:...` |

### JWT / Auth
| Var | Gevonden in |
|---|---|
| `Jwt__Key` | `appsettings.json` — symmetrische signing key |
| `TwoFactor__EncryptionKey` | `appsettings.json` — AES encryptie voor TOTP secrets |

### Email (SMTP)
| Var | Gevonden in |
|---|---|
| `Email__SmtpHost` | `appsettings.json` |
| `Email__SmtpPort` | `appsettings.json` |
| `Email__SmtpUser` | `appsettings.json` |
| `Email__SmtpPassword` | `appsettings.json` |
| `Email__FromEmail` | `appsettings.json` |
| `Email__FromName` | `appsettings.json` |

### Backend runtime
| Var | Gevonden in |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `docker-compose.yml` |
| `ASPNETCORE_URLS` | `docker-compose.yml` |
| `SEED_ON_START` | `docker-compose.yml`, `render.yaml` |
| `AdminisGcId` | `WorkflowService.cs:76` — default 1, niet in appsettings |

### Frontend
| Var | Gevonden in |
|---|---|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local`, `frontend/.env.example`, `docker-compose.yml` — URL naar backend |
| `INTERNAL_API_URL` | `frontend/.env.example`, `docker-compose.yml` — server-side backend URL (Docker) |
| `BACKEND_URL` | `frontend/app/api/[...path]/route.ts:7` — alias voor INTERNAL_API_URL in proxy route |

**⚠️ Beveiligingswaarschuwing:** `backend/MigrationRunner.cs:36` en `backend/Migrations/000_SUPABASE_SETUP.md` bevatten plaintext Supabase credentials in de repo. Dit moet geroteerd worden na de migratie.

---

## 6. CODEKWALITEIT

### Grootste rommel-hotspots

**1. `frontend/lib/api.ts` (882 regels) — te groot, te veel stub functies**
- Bevat tientallen "dummy" / "not implemented" functies die `Promise.resolve(null)` of `[]` returnen
- Voorbeelden: `deleteTimeEntry`, `getVacationRequests`, `getAdminStats`, `getAdminTimeEntries`, `registerUser`, `deleteProject`, `updateTimeEntry`, `deleteUser`, `approveTimeEntry`, `rejectTimeEntry`, `getSystemStatus`, `processVacationRequest`, `getAdminProjects` (→ admin endpoints die niet bestaan in de backend)
- Deze functies creëren een vals gevoel van compleetheid
- Oplossing: dode stubs weggooien of tabel-driven error responses geven

**2. `backend/Services/WorkflowService.cs` (820 regels) + `PostgresWorkflowRepository.cs` (439 regels)**
- `MapToDtos()` methode doet per entry nog individuele Firebird queries voor taak/werk details
- `WorkflowController.cs` injecteert raw connectionstring en opent zelf NpgsqlConnection voor notificaties — slecht pattern, hoort in een repository
- `InsertIntoFirebirdAsync()` in WorkflowService doet domeinlogica én infrastructuurwerk

**3. Dode bestanden (.disabled / .bak)**
- `backend/Infrastructure/PostgresDbContext.cs.disabled` — EF Core context, volledig uitgeschakeld
- `backend/Services/TimeEntryService.cs.disabled`
- `backend/Tests/TimeEntryServiceTests.cs.disabled`
- `backend/Repositories/PostgresUserRepository.cs.disabled`
- `backend/Repositories/PostgresVacationRepository.cs.disabled`
- `backend/Controllers/UsersController.cs.bak`
- `backend/Program.cs.bak`
- `frontend/app/manager/approve/page_temp.tsx`
Deze liggen in de repo en creëren verwarring over de actieve code.

**4. Inconsistente auth-patronen**
- Sommige routes gebruiken `X-MEDEW-GC-ID` (de primaire auth-identifier)
- Andere gebruiken `X-USER-ID` (de PostgreSQL-interne ID)
- Weer anderen gebruiken `X-USER-ROLE` (voor manager-check)
- De middleware (`MedewGcIdMiddleware`) heeft een lange lijst van per-route uitzonderingen (rules in Program.cs:196-296) — dit is fragiel

**5. Hardcoded waarden**
- `backend/Repositories/PostgresLeaveRepository.cs:232`: `taak_gc_id = 100256` hardcoded voor verlof
- `backend/WorkflowService.cs:76`: `AdminisGcId` default `1` via `GetValue<int>("AdminisGcId", 1)` — staat niet in appsettings

**6. Frontend: middleware uitgeschakeld**
- `frontend/app/middleware.ts:4`: `return;` — middleware doet niets. Routebeveiliging zit in componenten via `ProtectedRoute.tsx` / `AdminRoute.tsx` / `ManagerRoute.tsx`. Dit is client-side only en daarmee te omzeilen door URL-direct-access.

**7. Dubbele Firebird-query in MapToDtos()**
- `WorkflowService.cs:746-809`: pre-fetch van employee names in 1 query ✓
- Maar taak/werk details worden nog steeds per entry individueel opgehaald (N+1 probleem voor grotere lijsten)

### Map-/folderstructuur

```
clockwise-project/
├── backend/               ← C# .NET 8 Web API
│   ├── Controllers/       ← 20+ controllers
│   ├── Data/              ← PostgreSQLConnectionFactory
│   ├── Domain/            ← domein-entiteiten (deels shadow van Models/)
│   ├── Infrastructure/    ← FirebirdConnectionFactory (+ disabled EF Core)
│   ├── Migrations/        ← SQL migraties (012-021, 001-011 ONTBREKEN)
│   ├── Models/            ← DTOs en request/response modellen
│   ├── Repositories/      ← Firebird + Postgres repositories
│   ├── Scripts/           ← admin SQL scripts (assign managers etc.)
│   ├── Services/          ← businesslogica
│   └── Tests/             ← .disabled testbestand
├── database/              ← atrium_mvp.fdb (Firebird database file!)
├── frontend/              ← Next.js 15 App Router
│   ├── app/               ← pagina's (dashboard, admin, manager, auth)
│   ├── api/               ← frontend API helpers (auth.ts, timeEntries.ts, users.ts)
│   ├── components/        ← gedeelde UI-componenten
│   └── lib/               ← utilities (api.ts, auth-utils.ts, types.ts, etc.)
└── docker-compose.yml     ← lokale dev met Firebird + backend + frontend
```

**Structuurproblemen:**
- `Domain/` en `Models/` overlappen grotendeels — onduidelijk waarom beide bestaan
- `backend/Data/` heeft alleen `PostgreSQLConnectionFactory` — hoort in `Infrastructure/`
- Migratie-SQL bestanden 001-011 ontbreken uit de repo (alleen via Supabase SQL editor gedraaid)
- De `.fdb` Firebird database zit in de repo (`database/atrium_mvp.fdb`) — grote binary in Git

---

## MIGRATIE-IMPACT

### Samenvatting per Supabase-feature

| Feature | Gebruikt? | Migratie-impact | Reden |
|---|---|---|---|
| **Database (PostgreSQL)** | JA | **TRIVIAAL** | Puur Npgsql+Dapper, raw SQL. Alleen connectionstring wijzigen. |
| **Supabase Auth** | NEE | **N.V.T.** | Volledig eigen auth stack (BCrypt + JWT). Geen `auth.users` dependency. |
| **Row Level Security (RLS)** | NEE | **N.V.T.** | RLS nooit geactiveerd. Security zit in applicatielaag. |
| **Supabase Storage** | NEE | **N.V.T.** | Geen file uploads. |
| **Supabase Realtime** | NEE | **N.V.T.** | Geen WebSocket subscriptions. |
| **Edge Functions** | NEE | **N.V.T.** | Geen Supabase Edge Functions. |
| **PostgREST API** | NEE | **N.V.T.** | Alle queries via Npgsql/Dapper, niet via Supabase REST. |
| **Supabase Dashboard** | Beheer | **LAAG** | Dashboard voor ad-hoc SQL queries / tabelinzage — vervangen door DBeaver/pgAdmin of Neon console. |

### Concreet migratieplan

1. **Neon database aanmaken** — projecten en branch aanmaken op neon.tech
2. **Schema migreren** — SQL migraties 001-021 draaien op Neon (let op: 001-011 SQL bestanden **ontbreken** in repo — die moeten eerst uit de Supabase-database ge-dump'd worden via `pg_dump --schema-only`)
3. **Data migreren** — `pg_dump` van Supabase → `psql` op Neon
4. **Connectionstring updaten** — `appsettings.json` en secrets:
   ```json
   "ConnectionStrings": {
     "PostgreSQL": "Host=<neon-host>.neon.tech;Port=5432;Database=neondb;Username=<user>;Password=<pass>;SSL Mode=Require;Trust Server Certificate=true"
   }
   ```
5. **SSL** — Neon vereist SSL, Npgsql 8.x ondersteunt dit out-of-the-box
6. **Connection pooling** — Neon gebruikt Neon Proxy voor pooling. De huidige Supabase pooler-URL (aws-1-eu-west-1.pooler.supabase.com) kan 1:1 vervangen worden door de Neon pooler-URL. Geen codewijziging nodig.
7. **Credentials roteren** — de huidige Supabase credentials staan in de repo; roteren na dump.

### Risico's en aandachtspunten

| Risico | Ernst | Uitleg |
|---|---|---|
| Missende migratie-SQL (001-011) | **MATIG** | Deze zijn nooit opgeslagen in de repo. Vereisen een `pg_dump --schema-only` van Supabase voordat de instantie stopt. |
| `GRANT ... TO authenticated/anon` | **LAAG** | In `020_CreateSystemSettingsTable.sql`. Op Neon bestaan deze Supabase-rollen niet. Deze GRANT statements falen bij migratie. Weghalen of aanpassen. |
| Hardcoded credentials in repo | **HOOG** | `MigrationRunner.cs:36` en `000_SUPABASE_SETUP.md` bevatten plaintext wachtwoorden. Onmiddellijk roteren, bestanden sanitiseren. |
| `AdminisGcId` niet geconfigureerd | **LAAG** | Default `1` werkt, maar zou expliciet in appsettings moeten staan. |
| Client-side auth state (localStorage) | **MEDIUM** | Tokens in localStorage zijn kwetsbaar voor XSS. Geen blocker voor migratie, maar een technische schuld. |

---

*Einde audit — geen codewijzigingen uitgevoerd.*
