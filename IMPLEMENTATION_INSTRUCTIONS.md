# 🚀 Implementatie Instructies - 2FA & Notifications

## ✅ Wat is geïmplementeerd?

### 2FA (Two-Factor Authentication)
- ✅ Backend: TwoFactorService met TOTP en Email support
- ✅ Backend: TwoFactorController met setup/verify/disable endpoints
- ✅ Backend: AuthController updated met 2FA login flow
- ✅ Frontend: TwoFactorSetup component met QR code en backup codes
- ✅ Frontend: Login page met 2FA verificatie
- ✅ Encryption voor TOTP secrets (AES)
- ✅ Backup codes systeem

### Notifications (PostgreSQL)
- ✅ Database tabel: `notifications` in PostgreSQL
- ✅ Backend: NotificationRepository met CRUD operaties
- ✅ Backend: NotificationsController met REST API
- ✅ Frontend: NotificationBell updated naar PostgreSQL
- ✅ Support voor verschillende notification types

---

## 📦 Stap 1: Install Dependencies

### Backend NuGet Packages

```powershell
cd backend

# 2FA packages
dotnet add package OtpNet --version 1.9.3
dotnet add package QRCoder --version 1.4.3
dotnet add package MailKit --version 4.3.0
dotnet add package MimeKit --version 4.3.0
```

---

## 🗄️ Stap 2: Database Migrations

### Notifications Tabel

```powershell
# Run migration script in PostgreSQL
psql -U postgres.ynajasnxfvgtlbjatlbw -h aws-1-eu-west-1.pooler.supabase.com -d postgres -f backend/Migrations/016_CreateNotificationsTable.sql
```

Of via Supabase SQL editor:

```sql
-- Kopieer de inhoud van backend/Migrations/016_CreateNotificationsTable.sql
-- Plak in Supabase SQL editor en run
```

### Verificatie

```sql
-- Check of notifications tabel bestaat
SELECT * FROM notifications LIMIT 10;

-- Check of 2FA columns zijn toegevoegd aan users
\d users;
```

---

## ⚙️ Stap 3: Configuratie

### Backend: appsettings.json

✅ Al gedaan! Maar update deze waarden:

```json
{
  "TwoFactor": {
    "EncryptionKey": "VERANDER-DIT-32-CHAR-PROD-KEY!"
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "SmtpUser": "jouw-email@gmail.com",
    "SmtpPassword": "jouw-app-wachtwoord",
    "FromEmail": "noreply@clockwise.com",
    "FromName": "Clockwise"
  }
}
```

### Gmail App Password (voor Email 2FA)

1. Ga naar https://myaccount.google.com/apppasswords
2. Maak een nieuwe "App Password" aan
3. Gebruik deze in `SmtpPassword`

---

## 🏃 Stap 4: Test Locally

### Start Backend

```powershell
cd backend
dotnet restore
dotnet build
dotnet run
```

Backend draait op: http://localhost:5000

### Start Frontend

```powershell
cd frontend
npm install
npm install qrcode.react
npm run dev
```

Frontend draait op: http://localhost:3000

---

## 🧪 Stap 5: Test Features

### Test 2FA Setup

1. Login met bestaande gebruiker
2. Ga naar account settings (voeg TwoFactorSetup component toe aan een pagina)
3. Kies "Email" of "Authenticator App"
4. Voor TOTP: Scan QR code met Google Authenticator
5. Sla backup codes op!
6. Activeer 2FA met verificatiecode

### Test 2FA Login

1. Logout
2. Login met username + password
3. Voer 2FA code in (van email of authenticator app)
4. Succesvol ingelogd! ✅

### Test Notifications

1. Login als medewerker
2. Voeg een timesheet toe (dit zou notification moeten triggeren voor manager)
3. Check NotificationBell - zou moeten tellen en tonen

**LET OP**: Notifications worden nu vanuit PostgreSQL gehaald, niet meer Firebird!
Je moet zelf notifications **aanmaken** via de API wanneer events gebeuren.

---

## 📝 Notifications Aanmaken

### Voorbeeld: Bij Timesheet Submit

In je TimeEntriesController of TimesheetsController:

```csharp
// Na successvol toevoegen van timesheet
var notification = new CreateNotificationDto
{
    UserId = managerUserId, // Manager krijgt notificatie
    Type = "timesheet_submitted",
    Title = "Nieuwe Urenregistratie",
    Message = $"{employeeName} heeft uren ingevuld voor {date}",
    RelatedEntityType = "timesheet",
    RelatedEntityId = timesheetId
};

await _notificationRepository.CreateAsync(notification);
```

### Notification Types

```
timesheet_submitted   - Medewerker heeft uren ingevuld
timesheet_approved    - Manager heeft uren goedgekeurd
timesheet_rejected    - Manager heeft uren afgekeurd
project_assigned      - Project is toegewezen aan medewerker
vacation_approved     - Vakantie is goedgekeurd
vacation_rejected     - Vakantie is afgekeurd
```

---

## 🔐 Security Checklist

- [ ] **TwoFactor:EncryptionKey** vervangen met sterke 32-char key in productie
- [ ] **Email:SmtpPassword** uit appsettings.json en gebruik environment variables
- [ ] HTTPS gebruiken in productie
- [ ] Rate limiting toevoegen aan 2FA endpoints (max 5 pogingen per 15 min)
- [ ] Logging van 2FA events reviewen

---

## 🐛 Troubleshooting

### Backend build errors?

```powershell
cd backend
dotnet clean
dotnet restore
dotnet build
```

### Frontend build errors?

```powershell
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
npm install qrcode.react
```

### Database connection errors?

Check connection strings in appsettings.json:
- PostgreSQL moet correct zijn (Supabase)
- Firebird moet correct zijn (lokale database)

### Email niet verzonden?

- Check Gmail App Password correct is
- Check `SmtpUser` en `SmtpPassword` in appsettings.json
- Check firewall/antivirus blokkeert niet port 587

### Notifications empty array?

- Run de SQL migration script: `016_CreateNotificationsTable.sql`
- Check of tabel bestaat: `SELECT * FROM notifications;`
- Notifications moeten **handmatig** aangemaakt worden via API

---

## 📚 API Endpoints

### 2FA Endpoints

```
GET    /api/two-factor/status          - Check 2FA status
POST   /api/two-factor/setup           - Setup 2FA (email of totp)
POST   /api/two-factor/verify          - Verify en enable 2FA
POST   /api/two-factor/disable         - Disable 2FA
POST   /api/two-factor/send-email-code - Request email code
```

### Notifications Endpoints

```
GET    /api/notifications              - Get alle notifications
GET    /api/notifications?unreadOnly=true - Get alleen ongelezen
GET    /api/notifications/unread-count - Get aantal ongelezen
POST   /api/notifications              - Create notification
PUT    /api/notifications/{id}/read    - Mark as read
PUT    /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/{id}         - Delete notification
```

---

## 🎯 Next Steps

1. **Test alles lokaal** ✅
2. **Voeg TwoFactorSetup component toe** aan een settings pagina
3. **Implementeer notification triggers** bij belangrijke events
4. **Test 2FA flow** end-to-end
5. **Deploy naar productie** met juiste secrets

---

Succes! 🚀

Vragen? Check de code comments of console logs voor debugging.
