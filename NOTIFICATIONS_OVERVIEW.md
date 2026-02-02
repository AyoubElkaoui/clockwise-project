# 📬 Notificaties Overzicht

## Waar krijg je nu notificaties voor?

### ✅ GEÏMPLEMENTEERD

#### 1. **Timesheet Goedgekeurd** (`timesheet_approved`)
- **Wanneer:** Manager keurt je timesheet goed
- **Ontvanger:** Medewerker die timesheet heeft ingediend
- **Bericht:** "Je timesheet voor week {weeknummer} is goedgekeurd"
- **Trigger:** `POST /api/timesheets/{id}/approve`

#### 2. **Timesheet Afgekeurd** (`timesheet_rejected`)
- **Wanneer:** Manager keurt je timesheet af
- **Ontvanger:** Medewerker die timesheet heeft ingediend
- **Bericht:** "Je timesheet voor week {weeknummer} is afgekeurd. Reden: {reden}"
- **Trigger:** `POST /api/timesheets/{id}/reject`

#### 3. **Verlofaanvraag Goedgekeurd** (`vacation_approved`)
- **Wanneer:** Manager keurt je verlofaanvraag goed
- **Ontvanger:** Medewerker die verlof heeft aangevraagd
- **Bericht:** "Je verlofaanvraag van {startdatum} tot {einddatum} is goedgekeurd"
- **Trigger:** `POST /api/vacation/{id}/approve`

#### 4. **Verlofaanvraag Afgekeurd** (`vacation_rejected`)
- **Wanneer:** Manager keurt je verlofaanvraag af
- **Ontvanger:** Medewerker die verlof heeft aangevraagd
- **Bericht:** "Je verlofaanvraag van {startdatum} tot {einddatum} is afgekeurd. Reden: {reden}"
- **Trigger:** `POST /api/vacation/{id}/reject`

#### 5. **Project Toegewezen** (`project_assigned`)
- **Wanneer:** Je wordt toegewezen aan een nieuw project
- **Ontvanger:** Medewerker die aan project wordt toegewezen
- **Bericht:** "Je bent toegewezen aan project {project_id}"
- **Trigger:** `POST /api/user-projects`

#### 6. **Timesheet Ingediend** (`timesheet_submitted`) ⭐ NIEUW
- **Wanneer:** Medewerker dient een timesheet in voor goedkeuring
- **Ontvanger:** Manager van de medewerker
- **Bericht:** "{voornaam} {achternaam} heeft een timesheet ingediend voor goedkeuring"
- **Trigger:** `POST /api/workflow/submit`

#### 7. **Verlofaanvraag Ingediend** (`vacation_requested`) ⭐ NIEUW
- **Wanneer:** Medewerker vraagt nieuw verlof aan
- **Ontvanger:** Manager van de medewerker
- **Bericht:** "{voornaam} {achternaam} heeft verlof aangevraagd van {startdatum} tot {einddatum}"
- **Trigger:** `POST /api/vacation`

---

## 🔔 Hoe notificaties te zien?

1. **Notification Bell** - Rechtsboven in de header, toont aantal ongelezen notificaties
2. **Dropdown** - Klik op de bell om je laatste notificaties te zien
3. **Mark as Read** - Klik op een notificatie om te markeren als gelezen
4. **Mark All Read** - Button onderaan om alle notificaties als gelezen te markeren

---

## 🎯 Waar Kunnen Notificaties Nog Toegevoegd Worden?

### Mogelijke Toekomstige Notificaties:

#### 1. **Uren Bijna Vol**
- **Wanneer:** Medewerker nadert maximale uren voor de week
- **Ontvanger:** Medewerker zelf
- **Implementatie:** In TimeEntriesController bij uren registratie

#### 2. **Deadline Reminder**
- **Wanneer:** Timesheet indienen deadline nadert (bijv. vrijdag 17:00)
- **Ontvanger:** Alle medewerkers met onvoltooide timesheet
- **Implementatie:** Via scheduled job/background task

#### 3. **Project Verwijderd**
- **Wanneer:** Je wordt verwijderd van een project
- **Ontvanger:** Medewerker
- **Implementatie:** In UserProjectsController bij `DELETE /api/user-projects/{id}`

---

## 📊 Database Schema

De notificaties worden opgeslagen in PostgreSQL:

```sql
Table: notifications
- id (int, primary key)
- user_id (int, FK naar users.id)
- type (varchar(50)) - bijv: 'timesheet_approved', 'vacation_rejected'
- title (varchar(200))
- message (text)
- related_entity_type (varchar(50)) - bijv: 'timesheet', 'vacation_request', 'project'
- related_entity_id (int) - ID van gerelateerde entiteit
- is_read (boolean, default false)
- created_at (timestamp)
- read_at (timestamp, nullable)
```

---

## 🔧 API Endpoints

- `GET /api/notifications` - Haal notificaties op voor ingelogde gebruiker
- `GET /api/notifications/unread-count` - Aantal ongelezen notificaties
- `POST /api/notifications` - Nieuwe notificatie aanmaken (systeem)
- `PUT /api/notifications/{id}/read` - Markeer als gelezen
- `PUT /api/notifications/read-all` - Markeer alle als gelezen
- `DELETE /api/notifications/{id}` - Verwijder notificatie

---

## 💡 Tips voor Uitbreiding

Wil je meer notificaties toevoegen? Volg deze stappen:

1. **Identificeer Event** - Waar in de code gebeurt de actie?
2. **Inject Repository** - Voeg `INotificationRepository` toe aan constructor
3. **Create Notification** - Na de actie:
   ```csharp
   await _notificationRepo.CreateAsync(new CreateNotificationDto
   {
       UserId = targetUserId,
       Type = "je_notificatie_type",
       Title = "Korte titel",
       Message = "Uitgebreide boodschap met details",
       RelatedEntityType = "entiteit_naam", // bijv "timesheet"
       RelatedEntityId = entiteit_id
   });
   ```
4. **Update Frontend** - Voeg icon toe in NotificationBell.tsx `getNotificationIcon()` functie

---

## 🎨 Frontend Iconen

Huidige notificatie types hebben deze iconen:

- `timesheet_approved` → ✅ CheckCircle (groen)
- `timesheet_rejected` → ❌ XCircle (rood)
- `vacation_approved` → ✅ CheckCircle (groen)
- `vacation_rejected` → ❌ XCircle (rood)
- `project_assigned` → 📁 Folder (blauw)
- Alle andere → 🔔 Bell (blauw)

Voeg nieuwe iconen toe in `NotificationBell.tsx` → `getNotificationIcon()` functie.

---

## 📝 Notities

- Notificaties worden **real-time** geladen bij elke pagina refresh
- Notificaties blijven bewaard totdat gebruiker ze expliciet verwijdert
- Ongelezen notificaties tonen als badge op notification bell
- System gebruikt PostgreSQL voor alle notificatie data (niet Firebird)
