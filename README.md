# Clockwise - Urenregistratie & Verlofbeheer

Clockwise is een urenregistratie- en verlofbeheersysteem gebouwd bovenop het bestaande **Atrium** (Syntess) systeem. De applicatie leest medewerker-, project- en taakgegevens uit een **Firebird**-database (Atrium) en gebruikt **PostgreSQL** (Supabase) voor moderne app-data zoals workflows, notificaties en gebruikersbeheer.

---

## Inhoudsopgave

1. [Architectuur overzicht](#architectuur-overzicht)
2. [Tech stack](#tech-stack)
3. [Project structuur](#project-structuur)
4. [Installatie & Starten](#installatie--starten)
5. [Databases in detail](#databases-in-detail)
6. [Backend API Routes](#backend-api-routes)
7. [Firebird - Wat wordt waar gehaald](#firebird---wat-wordt-waar-gehaald)
8. [PostgreSQL - App data](#postgresql---app-data)
9. [Workflows: Uren & Verlof](#workflows-uren--verlof)
10. [Authenticatie & Autorisatie](#authenticatie--autorisatie)
11. [Frontend pagina's](#frontend-paginas)
12. [End-to-end voorbeelden](#end-to-end-voorbeelden)
13. [Troubleshooting](#troubleshooting)

---

## Architectuur overzicht

```
┌──────────────────┐     HTTP/JSON      ┌──────────────────┐
│                  │ ◄────────────────► │                  │
│  Frontend        │   localhost:3000    │  Backend         │
│  (Next.js 14)    │                    │  (.NET 8 API)    │
│                  │                    │  localhost:5000   │
└──────────────────┘                    └────────┬─────────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    │                         │
                              ┌─────▼──────┐          ┌──────▼───────┐
                              │  Firebird   │          │  PostgreSQL  │
                              │  (Atrium)   │          │  (Supabase)  │
                              │  LEZEN +    │          │  LEZEN +     │
                              │  SCHRIJVEN  │          │  SCHRIJVEN   │
                              │  localhost:  │          │  Cloud       │
                              │  3050       │          │              │
                              └────────────┘          └──────────────┘
```

**Dataflow samenvatting:**
- **Firebird (Atrium)** = het legacy systeem van Syntess. Hier staan medewerkers, projecten, taken en de uiteindelijke urenregistraties.
- **PostgreSQL (Supabase)** = de moderne database voor de app zelf. Hier staan gebruikersaccounts, draft-uren, verlofaanvragen, notificaties, feestdagen en systeeminstellingen.
- De backend leest uit beide databases en schrijft naar beide wanneer nodig (bijv. goedgekeurde uren worden naar Firebird gepusht).

---

## Tech stack

| Onderdeel | Technologie |
|-----------|-------------|
| Frontend | Next.js 14+, React, TypeScript, Tailwind CSS |
| Backend | C# .NET 8, ASP.NET Core Web API |
| Database (legacy) | Firebird 3.0 (Atrium/Syntess) |
| Database (app) | PostgreSQL via Supabase (cloud) |
| ORM/Data access | Dapper (Firebird), Npgsql (PostgreSQL) |
| Auth | JWT tokens (7 dagen geldig) + optioneel 2FA |
| Hosting frontend | Vercel / localhost:3000 |
| Hosting backend | localhost:5000 |

---

## Project structuur

```
clockwise-project/
│
├── backend/                          # C# .NET 8 Web API
│   ├── Controllers/                  # API endpoints (23 controllers)
│   │   ├── AuthController.cs         # Login, JWT, 2FA
│   │   ├── WorkflowController.cs     # Uren draft/submit/approve
│   │   ├── VacationController.cs     # Verlofaanvragen CRUD
│   │   ├── TimeEntriesController.cs  # Uren ophalen
│   │   ├── ManagerController.cs      # Manager dashboard & goedkeuringen
│   │   ├── NotificationsController.cs# Meldingen
│   │   ├── HolidaysController.cs     # Feestdagen beheer
│   │   ├── ProjectsController.cs     # Projecten uit Firebird
│   │   ├── UsersController.cs        # Medewerkers uit Firebird
│   │   ├── CompaniesController.cs    # Bedrijven uit Firebird
│   │   ├── TwoFactorController.cs    # 2FA setup & verificatie
│   │   ├── FavoriteProjectsController.cs
│   │   ├── UserProjectsController.cs
│   │   ├── SystemSettingsController.cs
│   │   └── ...
│   │
│   ├── Services/                     # Business logica
│   │   ├── AuthenticationService.cs  # Login, wachtwoord hashing, JWT
│   │   ├── WorkflowService.cs        # Uren workflow (draft→submit→approve)
│   │   ├── VacationService.cs        # Verlof workflow
│   │   ├── TwoFactorService.cs       # TOTP & email 2FA
│   │   └── ...
│   │
│   ├── Repositories/                 # Database queries
│   │   ├── FirebirdUserRepository.cs        # AT_MEDEW queries
│   │   ├── FirebirdProjectRepository.cs     # AT_WERK queries
│   │   ├── FirebirdTaskRepository.cs        # AT_TAAK queries
│   │   ├── FirebirdTimeEntryRepository.cs   # AT_URENBREG queries
│   │   ├── FirebirdVacationRepository.cs    # AT_URENBREG schrijven (verlof)
│   │   ├── PostgresWorkflowRepository.cs    # time_entries_workflow
│   │   ├── PostgreSQLUserRepository.cs      # users tabel
│   │   ├── PostgresLeaveRepository.cs       # leave_requests_workflow
│   │   ├── NotificationRepository.cs        # notifications tabel
│   │   └── ...
│   │
│   ├── Models/                       # Data models & DTOs
│   ├── Data/                         # Connection factories
│   ├── Migrations/                   # PostgreSQL migraties
│   ├── Program.cs                    # Startup, middleware, DI
│   └── appsettings.json              # Connection strings & config
│
├── frontend/                         # Next.js 14 applicatie
│   ├── app/                          # Pagina's (App Router)
│   │   ├── (auth)/                   # Login & registratie (publiek)
│   │   ├── (dashboard)/              # Medewerker dashboard
│   │   ├── tijd-registratie/         # Uren invoeren
│   │   ├── uren-overzicht/           # Uren bekijken
│   │   ├── vakantie/                 # Verlof aanvragen
│   │   ├── notificaties/             # Meldingen
│   │   ├── manager/                  # Manager pagina's
│   │   │   ├── dashboard/            # Manager overzicht
│   │   │   ├── approve/              # Uren goedkeuren
│   │   │   ├── vacation/             # Verlof goedkeuren
│   │   │   ├── team/                 # Teamleden bekijken
│   │   │   └── ...
│   │   └── admin/                    # Admin pagina's
│   │       ├── users/                # Gebruikersbeheer
│   │       ├── holidays/             # Feestdagen beheer
│   │       ├── projects/             # Projecten beheer
│   │       └── ...
│   │
│   ├── components/                   # React componenten (40+)
│   │   ├── WeekOverview/             # Uren invoer component
│   │   ├── VacationOverview/         # Verlof component
│   │   ├── ui/                       # UI componenten (Button, Card, etc.)
│   │   └── ...
│   │
│   ├── lib/                          # Utilities & API laag
│   │   ├── api/                      # API client functies
│   │   │   ├── workflowApi.ts        # Draft/submit/approve calls
│   │   │   ├── vacationApi.ts        # Verlof API calls
│   │   │   ├── timeEntryApi.ts       # Uren ophalen
│   │   │   ├── userApi.ts            # Gebruikers
│   │   │   ├── companyApi.ts         # Bedrijven
│   │   │   ├── holidaysApi.ts        # Feestdagen
│   │   │   └── ...
│   │   ├── auth-utils.ts             # Auth helpers
│   │   └── dateUtils.ts              # Datum helpers
│   └── package.json
│
└── README.md
```

---

## Installatie & Starten

### Vereisten

- **Node.js** (v18+) - voor de frontend
- **.NET 8 SDK** - voor de backend
- **Firebird 3.0** - lokaal geinstalleerd (Atrium database)
- **Internet** - voor Supabase PostgreSQL (cloud)

### Backend starten

```bash
cd backend
dotnet restore
dotnet run
# API draait op http://localhost:5000
```

### Frontend starten

```bash
cd frontend
npm install
npm run dev
# App draait op http://localhost:3000
```

### Docker (alternatief)

```bash
npm run docker:up       # Start alles
npm run docker:down     # Stop alles
npm run docker:logs     # Bekijk logs
npm run docker:clean    # Reset database + volumes
```

---

## Databases in detail

### Firebird (Atrium) - Het legacy systeem

De Firebird database is het hart van het Atrium systeem van Syntess. Dit is de bestaande database die al in gebruik is voor personeels- en urenregistratie. Clockwise **leest** hieruit en **schrijft** goedgekeurde uren terug.

**Connectie:**
```
Server=localhost;Port=3050
Database=C:\ProgramData\Syntess\AtriumData\Databases\TST\ATRIUM.FDB
User=SYSDBA;Password=masterkey
```

#### Firebird tabellen die gebruikt worden

| Tabel | Wat staat erin | Hoe gebruikt |
|-------|---------------|--------------|
| `AT_MEDEW` | **Medewerkers** - alle personeelsleden | LEZEN - namen, IDs ophalen |
| `AT_WERK` | **Projecten/Werken** - alle projecten waar uren op geboekt worden | LEZEN - projectlijsten tonen |
| `AT_WERKGRP` | **Projectgroepen** - groepering van projecten | LEZEN - projecten filteren op groep |
| `AT_TAAK` | **Taken/Uurcodes** - type werk (regulier, vakantie Z03, snipperdag Z04, etc.) | LEZEN - taaklijsten, verloftypes |
| `AT_ADMINIS` | **Bedrijven/Administraties** | LEZEN - bedrijvenlijst |
| `AT_URENBREG` | **Urenregistraties** - de daadwerkelijke geboekte uren | LEZEN + SCHRIJVEN |
| `AT_URENPER` | **Urenperiodes** - maandelijkse periodes voor urenboeking | LEZEN - actieve periode ophalen |

### PostgreSQL (Supabase) - De app database

PostgreSQL wordt gebruikt voor alle moderne app-functionaliteit die niet in Atrium zit.

**Connectie:**
```
Host=aws-1-eu-west-1.pooler.supabase.com;Port=5432
Database=postgres
Username=postgres.ynajasnxfvgtlbjatlbw
```

#### PostgreSQL tabellen

| Tabel | Wat staat erin | Doel |
|-------|---------------|------|
| `users` | **Gebruikersaccounts** - username, wachtwoord hash, email, rol, 2FA data | Login, autorisatie |
| `time_entries_workflow` | **Uren workflow** - concept-uren die nog goedgekeurd moeten worden | Draft → Submit → Approve flow |
| `leave_requests_workflow` | **Verlofaanvragen** - vakantie/verlof met goedkeuringsflow | Verlofaanvraag → Goedkeuring |
| `notifications` | **Meldingen** - push notificaties voor gebruikers | Meldingen bij goedkeuring/afwijzing |
| `holidays` | **Feestdagen** - nationale en bedrijfsfeestdagen | Kalender, validatie |
| `manager_assignments` | **Manager-medewerker koppelingen** | Wie keurt wiens uren goed |
| `user_projects` | **Gebruiker-project toewijzingen** | Welke projecten mag een gebruiker boeken |
| `favorite_projects` | **Favoriete projecten** per gebruiker | Snelle selectie |
| `vacation_balance` | **Vakantiesaldo** - tegoed, gebruikt, pending | Verlofberekeningen |
| `system_settings` | **Systeeminstellingen** (bijv. 2FA verplicht) | Configuratie |

---

## Backend API Routes

### Authenticatie (`/api/auth`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| POST | `/api/auth/login` | Inloggen (username + wachtwoord + optioneel 2FA code) |
| GET | `/api/auth/me` | Huidige gebruiker ophalen |

### Uren Workflow (`/api/workflow`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| POST | `/api/workflow/draft` | Uren opslaan als concept |
| GET | `/api/workflow/drafts` | Alle concepten ophalen |
| GET | `/api/workflow/submitted` | Ingediende uren ophalen |
| GET | `/api/workflow/rejected` | Afgewezen uren ophalen |
| POST | `/api/workflow/submit` | Uren indienen bij manager |
| POST | `/api/workflow/approve` | Manager: uren goedkeuren |
| POST | `/api/workflow/reject` | Manager: uren afwijzen |

### Verlof (`/api/vacation`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| GET | `/api/vacation` | Eigen verlofaanvragen ophalen |
| GET | `/api/vacation/all` | Alle aanvragen (manager) |
| GET | `/api/vacation/types` | Verloftypes ophalen (Z03, Z04, etc.) |
| POST | `/api/vacation` | Nieuwe verlofaanvraag indienen |
| PUT | `/api/vacation/{id}` | Aanvraag bijwerken |
| DELETE | `/api/vacation/{id}` | Aanvraag verwijderen (alleen concept) |
| POST | `/api/vacation/{id}/approve` | Manager: goedkeuren |
| POST | `/api/vacation/{id}/reject` | Manager: afwijzen |

### Projecten & Bedrijven (uit Firebird)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| GET | `/api/projects` | Projecten ophalen uit AT_WERK |
| GET | `/api/projects/group/{id}` | Projecten per groep |
| GET | `/api/project-groups` | Projectgroepen uit AT_WERKGRP |
| GET | `/api/companies` | Bedrijven uit AT_ADMINIS |
| GET | `/api/users` | Medewerkers uit AT_MEDEW |

### Notificaties (`/api/notifications`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| GET | `/api/notifications` | Meldingen ophalen |
| GET | `/api/notifications/unread-count` | Aantal ongelezen |
| PUT | `/api/notifications/{id}/read` | Markeer als gelezen |
| PUT | `/api/notifications/read-all` | Alles gelezen markeren |

### Feestdagen (`/api/holidays`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| GET | `/api/holidays?year=2026` | Feestdagen ophalen |
| POST | `/api/holidays` | Feestdag toevoegen |
| POST | `/api/holidays/generate/{year}` | NL feestdagen genereren |

### Manager (`/api/manager`)
| Methode | Route | Beschrijving |
|---------|-------|-------------|
| GET | `/api/manager/dashboard/stats` | Dashboard statistieken |
| GET | `/api/manager/time-entries/pending` | Openstaande goedkeuringen |
| GET | `/api/manager/users` | Teamleden ophalen |

---

## Firebird - Wat wordt waar gehaald

Dit is het belangrijkste deel: welke data komt uit Firebird en hoe wordt het gebruikt.

### 1. Medewerkers ophalen (`AT_MEDEW`)

**Waar:** `FirebirdUserRepository.cs`
**Wanneer:** Bij het laden van medewerkerslijsten (admin, manager)

```sql
SELECT GC_ID, GC_OMSCHRIJVING
FROM AT_MEDEW
ORDER BY GC_OMSCHRIJVING
```

- `GC_ID` = uniek medewerker-ID (dit is het `medew_gc_id` dat overal gebruikt wordt)
- `GC_OMSCHRIJVING` = naam van de medewerker

**Koppeling:** De `users` tabel in PostgreSQL heeft een `medew_gc_id` kolom die naar `AT_MEDEW.GC_ID` verwijst. Zo wordt een app-account gekoppeld aan een Atrium medewerker.

### 2. Projecten ophalen (`AT_WERK`)

**Waar:** `FirebirdProjectRepository.cs`
**Wanneer:** Bij het laden van projectlijsten (uren invoeren, favorieten)

```sql
SELECT GC_ID AS GcId, GC_CODE AS GcCode, WERKGRP_GC_ID AS WerkgrpGcId,
       GC_OMSCHRIJVING AS Description
FROM AT_WERK
WHERE WERKGRP_GC_ID = @GroupId
ORDER BY GC_CODE
```

- `GC_ID` = project-ID (dit is `werk_gc_id` in de workflow)
- `GC_CODE` = projectcode (bijv. "P001")
- `WERKGRP_GC_ID` = koppeling naar projectgroep
- `GC_OMSCHRIJVING` = projectnaam

### 3. Projectgroepen ophalen (`AT_WERKGRP`)

**Waar:** `FirebirdProjectRepository.cs`
**Wanneer:** Bij het laden van projectgroep-filters

```sql
SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING
FROM AT_WERKGRP
ORDER BY GC_CODE
```

### 4. Taken / Uurcodes ophalen (`AT_TAAK`)

**Waar:** `FirebirdTaskRepository.cs`
**Wanneer:** Bij het laden van taaklijsten en verloftypes

```sql
-- Alle taken
SELECT GC_ID AS GcId, GC_CODE AS GcCode, GC_OMSCHRIJVING AS Omschrijving
FROM AT_TAAK
ORDER BY GC_CODE

-- Alleen verloftypes (codes die met 'Z' beginnen)
SELECT GC_ID AS GcId, GC_CODE AS GcCode, GC_OMSCHRIJVING AS Omschrijving
FROM AT_TAAK
WHERE GC_CODE STARTING WITH 'Z'
ORDER BY GC_CODE
```

**Belangrijke taakcodes:**
| Code | Betekenis |
|------|-----------|
| Z03 | Vakantie |
| Z04 | Snipperdag |
| Z05 | Ziekte |
| Z06 | Bijzonder verlof |
| Overige | Regulier werk |

### 5. Uren ophalen (`AT_URENBREG`)

**Waar:** `FirebirdTimeEntryRepository.cs` / `DapperTimeEntryRepository.cs`
**Wanneer:** Bij het bekijken van geboekte uren (overzichten)

```sql
SELECT u.GC_ID as Id, u.MEDEW_GC_ID as UserId, u.DATUM as EntryDate,
       u.AANTAL as Hours, u.WERK_GC_ID as ProjectId
FROM AT_URENBREG u
LEFT JOIN AT_MEDEW m ON u.MEDEW_GC_ID = m.GC_ID
LEFT JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
WHERE u.DATUM BETWEEN @fromDate AND @toDate
ORDER BY u.DATUM DESC
```

- `MEDEW_GC_ID` = welke medewerker
- `DATUM` = welke dag
- `AANTAL` = hoeveel uur
- `WERK_GC_ID` = op welk project
- `TAAK_GC_ID` = welk type werk/verlof

### 6. Uren SCHRIJVEN naar Firebird (`AT_URENBREG`)

**Dit is het cruciale deel - wanneer worden uren naar Firebird gepusht?**

**Waar:** `FirebirdVacationRepository.cs` + `WorkflowService.cs`
**Wanneer:** Alleen bij **goedkeuring** door een manager

#### Bij goedkeuring van werkuren:

```sql
INSERT INTO AT_URENBREG (MEDEW_GC_ID, DATUM, AANTAL, WERK_GC_ID, TAAK_GC_ID, GC_OMSCHRIJVING)
VALUES (@medewGcId, @date, @hours, @werkGcId, @taakGcId, @description)
```

#### Bij goedkeuring van verlof:

Voor elke dag van het verlof wordt een aparte regel aangemaakt:

```sql
INSERT INTO AT_URENBREG (MEDEW_GC_ID, DATUM, AANTAL, WERK_GC_ID, TAAK_GC_ID, GC_OMSCHRIJVING)
VALUES (@medewGcId, @date, 8, NULL, @taakGcId, 'Vacation: ' || @description)
```

- `WERK_GC_ID` = NULL bij verlof (geen project)
- `TAAK_GC_ID` = het verloftype (Z03, Z04, etc.)
- `AANTAL` = 8 uur per dag (standaard werkdag)
- Per dag van het verlof 1 rij (5 dagen verlof = 5 INSERT statements)

**Belangrijk:** Het schrijven naar Firebird is **non-critical**. Als het mislukt (bijv. Firebird is offline), wordt de goedkeuring in PostgreSQL toch doorgevoerd. De fout wordt gelogd maar de approval faalt niet.

### 7. Bedrijven ophalen (`AT_ADMINIS`)

**Waar:** `FirebirdDataRepository.cs`
**Wanneer:** Bij het laden van bedrijvenlijsten (admin)

```sql
SELECT GC_ID, GC_OMSCHRIJVING
FROM AT_ADMINIS
ORDER BY GC_OMSCHRIJVING
```

### 8. Periodes ophalen (`AT_URENPER`)

**Waar:** `PostgreSQLPeriodsRepository.cs` (naam is misleidend, leest uit Firebird)
**Wanneer:** Bij het bepalen van de actieve urenperiode

```sql
SELECT GC_ID, GC_CODE, STARTDATUM, EINDDATUM
FROM AT_URENPER
WHERE STARTDATUM <= @today AND EINDDATUM >= @today
```

---

## PostgreSQL - App data

### users tabel

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER,          -- Koppeling naar AT_MEDEW.GC_ID
    username VARCHAR(255),
    password_hash VARCHAR(255),    -- BCrypt hash
    email VARCHAR(255),
    role VARCHAR(50),              -- 'admin', 'manager', 'user'
    is_active BOOLEAN,
    two_factor_secret TEXT,        -- TOTP secret (versleuteld)
    two_factor_method VARCHAR(20), -- 'email' of 'totp'
    two_factor_email_code VARCHAR(6),
    two_factor_backup_codes TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP
);
```

### time_entries_workflow tabel

```sql
CREATE TABLE time_entries_workflow (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER,           -- Welke medewerker
    urenper_gc_id INTEGER,         -- Welke periode
    taak_gc_id INTEGER,            -- Welke taak (uit AT_TAAK)
    werk_gc_id INTEGER,            -- Welk project (uit AT_WERK)
    datum DATE,                     -- Welke dag
    aantal DECIMAL,                 -- Hoeveel uur
    omschrijving TEXT,             -- Notitie
    status VARCHAR(20),            -- DRAFT, SUBMITTED, APPROVED, REJECTED
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER,           -- Manager user ID
    rejection_reason TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### leave_requests_workflow tabel

```sql
CREATE TABLE leave_requests_workflow (
    id SERIAL PRIMARY KEY,
    medew_gc_id INTEGER,
    start_date DATE,
    end_date DATE,
    total_hours DECIMAL,
    taak_gc_id INTEGER,            -- Verloftype (Z03, Z04, etc.)
    status VARCHAR(20),            -- DRAFT, SUBMITTED, APPROVED, REJECTED
    notes TEXT,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP
);
```

### notifications tabel

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,               -- Naar wie
    type VARCHAR(50),              -- 'timesheet_submitted', 'timesheet_approved', etc.
    title VARCHAR(255),
    message TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## Workflows: Uren & Verlof

### Uren workflow

```
┌─────────┐    Opslaan     ┌───────────┐    Indienen    ┌─────────────┐
│  Invoer  │ ────────────► │   DRAFT   │ ─────────────► │  SUBMITTED  │
│  (form)  │               │ (concept) │                │ (ingediend) │
└─────────┘               └───────────┘                └──────┬──────┘
                                ▲                              │
                                │                    Manager bekijkt
                                │                              │
                          ┌─────┴──────┐              ┌───────▼───────┐
                          │  REJECTED  │ ◄─────────── │   Beoordeling │
                          │ (afgewezen)│   Afwijzen    │               │
                          └────────────┘              └───────┬───────┘
                                                              │
                                                    Goedkeuren│
                                                              ▼
                                                     ┌────────────────┐
                                                     │   APPROVED     │
                                                     │ (goedgekeurd)  │
                                                     │                │
                                                     │ → Schrijf naar │
                                                     │   AT_URENBREG  │
                                                     │   (Firebird)   │
                                                     └────────────────┘
```

**Stap voor stap:**

1. **DRAFT** - Medewerker vult uren in op de tijd-registratie pagina. Uren worden opgeslagen in `time_entries_workflow` met status `DRAFT`.
2. **SUBMITTED** - Medewerker klikt "Indienen". Status wordt `SUBMITTED`. Er wordt een notificatie aangemaakt voor de gekoppelde manager (via `manager_assignments`).
3. **APPROVED** - Manager keurt goed. Status wordt `APPROVED`. De uren worden naar Firebird `AT_URENBREG` geschreven. Medewerker krijgt een notificatie.
4. **REJECTED** - Manager wijst af met reden. Status wordt `REJECTED`. Medewerker krijgt een notificatie met de reden en kan de uren aanpassen en opnieuw indienen.

### Verlof workflow

```
┌────────────┐   Aanvragen    ┌─────────────┐
│  Verlof    │ ─────────────► │  SUBMITTED  │
│  formulier │                │ (ingediend) │
└────────────┘                └──────┬──────┘
                                     │
                           Manager bekijkt
                                     │
                          ┌──────────▼──────────┐
                          │    Beoordeling      │
                          └──────┬─────────┬────┘
                                 │         │
                       Goedkeuren│         │Afwijzen
                                 ▼         ▼
                    ┌────────────────┐  ┌────────────┐
                    │   APPROVED     │  │  REJECTED  │
                    │                │  │            │
                    │ → Vakantiesaldo│  │ → Saldo    │
                    │   bijwerken    │  │   hersteld │
                    │ → Per dag een  │  │ → Notifi-  │
                    │   rij in       │  │   catie    │
                    │   AT_URENBREG  │  │   met reden│
                    └────────────────┘  └────────────┘
```

**Bij goedkeuring verlof gebeurt er:**
1. `leave_requests_workflow` → status = `APPROVED`
2. `vacation_balance` → `pending` uren worden afgetrokken, `used` uren worden opgehoogd
3. `AT_URENBREG` (Firebird) → voor elke dag van het verlof wordt een rij aangemaakt met 8 uur en het juiste verloftype (Z03/Z04/etc.)
4. Notificatie naar de medewerker

---

## Authenticatie & Autorisatie

### Login flow

1. Gebruiker vult username + wachtwoord in
2. Frontend stuurt `POST /api/auth/login`
3. Backend checkt wachtwoord tegen BCrypt hash in `users` tabel
4. Als 2FA **uit** staat → JWT token terug
5. Als 2FA **aan** staat → `{ requires2FA: true, method: 'email'|'totp' }` terug
6. Gebruiker vult 2FA code in → opnieuw `POST /api/auth/login` met code
7. Backend verifieert code → JWT token terug

### JWT Token

Het token bevat:
- `id` - gebruiker ID
- `username`
- `medew_gc_id` - koppeling naar Atrium medewerker
- `role` - admin/manager/user
- `email`
- Geldig voor 7 dagen

### Request headers

Elke API call van de frontend bevat:
```
Authorization: Bearer {jwt-token}
X-MEDEW-GC-ID: {medewGcId}      # Atrium medewerker ID
X-User-ID: {userId}              # PostgreSQL user ID
```

### Rollen

| Rol | Rechten |
|-----|---------|
| `user` | Eigen uren invoeren, verlof aanvragen, eigen overzichten bekijken |
| `manager` | Alles van user + teamuren goedkeuren/afwijzen, verlof goedkeuren, team beheren |
| `admin` | Alles + gebruikersbeheer, feestdagen, projecten, systeeminstellingen |

### Middleware (`MedewGcIdMiddleware`)

De backend middleware controleert bij elke request:
1. Is er een `X-MEDEW-GC-ID` header aanwezig?
2. Zo ja → parse het als integer en sla op in `HttpContext.Items["MedewGcId"]`
3. Controllers gebruiken dit ID om te weten welke medewerker de request doet

Sommige routes zijn uitgezonderd (geen header nodig): login, feestdagen, periodes, 2FA.

---

## Frontend pagina's

### Medewerker

| Pagina | Route | Beschrijving |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Overzicht van recente activiteit |
| Uren invoeren | `/tijd-registratie` | Week/maand uren invoeren per project |
| Uren overzicht | `/uren-overzicht` | Alle ingevoerde uren bekijken met filters |
| Verlof aanvragen | `/vakantie` | Verlof/vakantie aanvragen |
| Notificaties | `/notificaties` | Meldingen bekijken |
| Account | `/account` | Profiel en 2FA instellingen |

### Manager

| Pagina | Route | Beschrijving |
|--------|-------|-------------|
| Dashboard | `/manager/dashboard` | Team statistieken |
| Uren goedkeuren | `/manager/approve` | Ingediende uren goedkeuren/afwijzen |
| Verlof goedkeuren | `/manager/vacation` | Verlofaanvragen beoordelen |
| Team | `/manager/team` | Teamleden bekijken |
| Planning | `/manager/planning` | Teamplanning |
| Jaarkalender | `/manager/jaarkalender` | Jaaroverzicht |

### Admin

| Pagina | Route | Beschrijving |
|--------|-------|-------------|
| Dashboard | `/admin` | Admin overzicht |
| Gebruikers | `/admin/users` | Accounts aanmaken/bewerken/verwijderen |
| Feestdagen | `/admin/holidays` | Feestdagen beheren |
| Projecten | `/admin/projects` | Projecten en groepen |
| Rapporten | `/admin/reports` | Rapportages |
| Instellingen | `/admin/settings` | Systeeminstellingen (2FA verplicht, etc.) |

---

## End-to-end voorbeelden

### Voorbeeld 1: Medewerker boekt een werkweek

**Maandag - Medewerker opent de app:**

1. Navigeert naar `/tijd-registratie`
2. Selecteert de huidige week
3. Kiest project "Klant ABC - Development" uit de lijst (uit `AT_WERK`)
4. Vult 8 uur in voor maandag
5. Klikt "Opslaan"

**Wat er in de backend gebeurt:**

```
POST /api/workflow/draft
Headers: X-MEDEW-GC-ID: 100001
Body: {
  urenperGcId: 100426,     ← Huidige periode uit AT_URENPER
  taakGcId: 30,            ← Werktaak uit AT_TAAK
  werkGcId: 456,           ← Project uit AT_WERK
  datum: "2026-02-16",
  aantal: 8,
  omschrijving: "Development"
}
```

**WorkflowService.SaveDraftAsync():**
1. `SELECT * FROM time_entries_workflow WHERE medew_gc_id=100001 AND datum='2026-02-16' AND werk_gc_id=456`
2. Bestaat niet → `INSERT INTO time_entries_workflow (...) VALUES (...) met status='DRAFT'`
3. Retourneert de opgeslagen entry verrijkt met data uit Firebird (projectnaam, taakcode)

**Woensdag - Medewerker dient de week in:**

```
POST /api/workflow/submit
Body: { entryIds: [201, 202, 203, 204, 205] }
```

**WorkflowService.SubmitAsync():**
1. `UPDATE time_entries_workflow SET status='SUBMITTED', submitted_at=NOW() WHERE id IN (201,202,203,204,205)`
2. `SELECT manager_id FROM manager_assignments WHERE employee_id = @userId`
3. `INSERT INTO notifications (user_id, type, title, message) VALUES (@managerId, 'timesheet_submitted', 'Uren ingediend', 'John heeft 40 uur ingediend voor week 8')`

**Vrijdag - Manager keurt goed:**

```
POST /api/workflow/approve
Body: { entryIds: [201, 202, 203, 204, 205], reviewedBy: 50 }
```

**WorkflowService.ApproveAsync():**
1. `UPDATE time_entries_workflow SET status='APPROVED', reviewed_by=50, reviewed_at=NOW()`
2. **Voor elke entry → schrijf naar Firebird:**
   ```sql
   INSERT INTO AT_URENBREG (MEDEW_GC_ID, DATUM, AANTAL, WERK_GC_ID, TAAK_GC_ID, GC_OMSCHRIJVING)
   VALUES (100001, '2026-02-16', 8, 456, 30, 'Development')
   ```
3. `INSERT INTO notifications (...) VALUES (@employeeId, 'timesheet_approved', ...)`

**Resultaat:**
- PostgreSQL: 5 rijen in `time_entries_workflow` met status `APPROVED`
- Firebird: 5 nieuwe rijen in `AT_URENBREG` (zichtbaar in Atrium)
- Notificaties: 2 aangemaakt (1 naar manager bij submit, 1 naar medewerker bij approve)

---

### Voorbeeld 2: Medewerker vraagt vakantie aan

**Medewerker opent `/vakantie`:**

1. Vult in: 16 maart t/m 20 maart 2026 (5 werkdagen)
2. Type: Z03 (Vakantie)
3. Reden: "Voorjaarsvakantie"
4. Klikt "Aanvragen"

**Backend:**

```
POST /api/vacation
Body: {
  startDate: "2026-03-16",
  endDate: "2026-03-20",
  vacationType: "Z03",
  notes: "Voorjaarsvakantie"
}
```

**VacationService:**
1. Berekent totaal: 5 dagen × 8 uur = 40 uur
2. `INSERT INTO leave_requests_workflow (medew_gc_id, start_date, end_date, total_hours, taak_gc_id, status, notes) VALUES (100001, '2026-03-16', '2026-03-20', 40, {Z03_GcId}, 'SUBMITTED', 'Voorjaarsvakantie')`
3. `UPDATE vacation_balance SET pending = pending + 40 WHERE medew_gc_id = 100001`
4. Notificatie naar manager: "John heeft 5 dagen vakantie aangevraagd"

**Manager keurt goed:**

```
POST /api/vacation/123/approve
Body: { reviewedBy: 50 }
```

**VacationService.ApproveAsync():**
1. `UPDATE leave_requests_workflow SET status='APPROVED', reviewed_by=50, reviewed_at=NOW()`
2. `UPDATE vacation_balance SET pending = pending - 40, used = used + 40`
3. **Schrijf 5 rijen naar Firebird AT_URENBREG:**
   ```sql
   -- Dag 1: maandag 16 maart
   INSERT INTO AT_URENBREG (MEDEW_GC_ID, DATUM, AANTAL, WERK_GC_ID, TAAK_GC_ID, GC_OMSCHRIJVING)
   VALUES (100001, '2026-03-16', 8, NULL, @Z03_GcId, 'Vacation: Voorjaarsvakantie')

   -- Dag 2: dinsdag 17 maart
   INSERT INTO AT_URENBREG (MEDEW_GC_ID, DATUM, AANTAL, WERK_GC_ID, TAAK_GC_ID, GC_OMSCHRIJVING)
   VALUES (100001, '2026-03-17', 8, NULL, @Z03_GcId, 'Vacation: Voorjaarsvakantie')

   -- ... enzovoort voor dag 3, 4, 5
   ```
4. Notificatie naar medewerker: "Je vakantie is goedgekeurd"

**Let op:** Bij verlof is `WERK_GC_ID = NULL` (geen project), en de `TAAK_GC_ID` verwijst naar het verloftype in `AT_TAAK`.

---

## Troubleshooting

### Backend start niet

```bash
# Check of Firebird draait
# Firebird moet lokaal draaien op poort 3050
# Database pad: C:\ProgramData\Syntess\AtriumData\Databases\TST\ATRIUM.FDB

# Check of Supabase bereikbaar is
# De PostgreSQL connectie gaat via internet naar Supabase cloud
```

### Frontend kan backend niet bereiken

- Backend moet draaien op `http://localhost:5000`
- Check CORS instellingen in `Program.cs`
- Toegestane origins: `clockd.nl`, `localhost:3000`, `localhost:3001`

### Login werkt niet

- Check of de gebruiker bestaat in de `users` tabel (PostgreSQL)
- Check of het `medew_gc_id` geldig is in `AT_MEDEW` (Firebird)
- Wachtwoord is opgeslagen als BCrypt hash

### Uren verschijnen niet in Atrium

- Uren verschijnen pas in Firebird na **goedkeuring** door een manager
- Check of Firebird beschikbaar was op het moment van goedkeuring
- Check de backend logs voor Firebird write errors

### Docker setup

```bash
npm run docker:up       # Start alles
npm run docker:down     # Stop alles
npm run docker:logs     # Bekijk logs
npm run docker:clean    # Reset database + volumes
npm run docker:restart  # Herstart alles
```
