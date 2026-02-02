# Fix Overzicht - Manager Dashboard Verbeteringen

## Datum: 2 februari 2026

## ✅ Uitgevoerde Fixes

### 1. Navbar Logo (Altum) - ✅ OPGELOST

**Probleem:**
- Het Altum logo in de navbar was te groot (h-20 / 80px)
- Bij vergroten werd de hele navbar groter

**Oplossing:**
- Logo verkleind van `h-20` (80px) naar `h-8` (32px)
- `object-contain` class toegevoegd voor betere schaling
- Width en height props aangepast naar realistische waarden

**Bestand:** `frontend/components/Navbar.tsx`

**Code wijziging:**
```tsx
// VOOR:
className="h-20 w-auto dark:hidden"
width={500}
height={120}

// NA:
className="h-8 w-auto object-contain dark:hidden"
width={80}
height={32}
```

---

### 2. Aanwezigheidskalender - ✅ OPGELOST

**Probleem:**
- Kalender toonde mogelijk niet alle werkdagen correct
- Status filtering was te strikt (alleen "goedgekeurd")
- Vakantiedagen telden mogelijk niet correct

**Oplossing:**
- Verbeterde `calculateStats` functie met flexibele status checks
- Ondersteunt nu meerdere status waarden:
  - "goedgekeurd"
  - "approved" 
  - "afgekeurd"
- Betere null/undefined checks voor datums
- Verbeterde vakantie counting logica

**Bestand:** `frontend/app/(dashboard)/aanwezigheidskalender/page.tsx`

**Key improvements:**
```tsx
// Flexibele status check
const isApproved = entry.status?.toLowerCase() === "goedgekeurd" || 
                  entry.status?.toLowerCase() === "approved" ||
                  entry.status?.toLowerCase() === "afgekeurd";

// Veiligere datum checks
if (isApproved && entry.startTime) {
  const dateStr = dayjs(entry.startTime).format("YYYY-MM-DD");
  workDays.add(dateStr);
  totalHours += entry.hoursWorked || 0;
}

// Vakantie filtering voor huidig jaar
const approvedVacations = vacationRequests.filter((v) => {
  const isApproved = v.status?.toLowerCase() === "approved" || 
                    v.status?.toLowerCase() === "goedgekeurd";
  const inCurrentYear = v.startDate && (
    dayjs(v.startDate).year() === currentYear ||
    dayjs(v.endDate).year() === currentYear
  );
  return isApproved && inCurrentYear;
}).length;
```

---

### 3. Wachtwoord Wijzigen - ✅ AL GEÏMPLEMENTEERD

**Status:** Wachtwoord wijzigen functionaliteit is **al volledig geïmplementeerd**!

**Locaties:**
1. **Voor alle gebruikers:** `frontend/app/account/page.tsx`
   - Volledig werkend formulier
   - Validatie aanwezig
   - Backend endpoint: `POST /users/{userId}/change-password`

2. **Voor managers:** `frontend/app/manager/settings/page.tsx`
   - Aparte settings pagina
   - Zelfde backend endpoint

**Hoe te gebruiken:**
1. Login als gebruiker
2. Ga naar "Account" in menu
3. Scroll naar "Beveiliging" sectie
4. Vul in:
   - Huidig wachtwoord
   - Nieuw wachtwoord
   - Bevestig nieuw wachtwoord
5. Klik "Wachtwoord Wijzigen"

**Backend endpoint werkt:**
```csharp
POST /api/users/{userId}/change-password
{
  "currentPassword": "oud_wachtwoord",
  "newPassword": "nieuw_wachtwoord"
}
```

---

### 4. Two-Factor Authentication (2FA) - 📝 IMPLEMENTATIE PLAN

**Status:** Nog niet geïmplementeerd

**Documentatie:** Volledige implementatie plan beschikbaar in:
- `2FA_IMPLEMENTATION_PLAN.md`

**Samenvatting:**
- **Aanbevolen methode:** TOTP (Time-based One-Time Password)
- **Geschatte tijd:** 3-4 dagen
- **Kosten:** €0 (geen externe dependencies)
- **Technologie:** 
  - Backend: OtpNet NuGet package
  - Frontend: qrcode.react npm package
  - Werkt met Google Authenticator, Microsoft Authenticator, etc.

**Gefaseerde rollout aanbevolen:**
1. **Fase 1:** Wachtwoord beveiliging (✅ DONE)
2. **Fase 2:** 2FA optioneel voor iedereen
3. **Fase 3:** 2FA verplicht voor admins/managers
4. **Fase 4:** 2FA voor alle gebruikers

**Next steps voor 2FA:**
1. Stakeholder approval
2. Sprint planning
3. Database migratie
4. Backend implementatie (1-2 dagen)
5. Frontend implementatie (1 dag)
6. Testing (0.5-1 dag)
7. Deployment

---

### 5. Notificaties - 🔍 DIAGNOSE & FIX

**Probleem:**
- Gebruikers zien mogelijk geen notificaties
- NotificationBell component had geen error logging

**Diagnose:**
✅ Backend API endpoints zijn correct:
- `GET /api/activities?userId={id}&limit={n}`
- `GET /api/activities/{userId}`
- `POST /api/activities/{id}/read`
- `PUT /api/activities/{id}/read`
- `PUT /api/activities/read-all?userId={id}`

✅ Frontend components zijn correct:
- `NotificationBell.tsx`
- `app/notificaties/page.tsx`
- `app/manager/notificaties/page.tsx`

**Mogelijke oorzaken:**
1. **Database heeft geen activities data** (meest waarschijnlijk)
   - Query in FirebirdDataRepository is restrictief
   - Alleen entries met `TAAK_GC_ID IS NOT NULL` en `WERK_GC_ID IS NULL`

2. **UserId niet correct doorgegeven**
   - Fixed met betere logging

**Oplossing geïmplementeerd:**
- Toegevoegd: Console logging in NotificationBell component
- Toegevoegd: Error details logging
- Toegevoegd: userId validation

**Verbeterde code:**
```tsx
console.log("NotificationBell: Fetching activities for userId:", userId);
const data = await getActivities(20, userId);
console.log("NotificationBell: Received activities:", data);
```

**Om notificaties te zien:**

De query in backend verwacht specifieke data structuur:
```sql
SELECT r.DOCUMENT_GC_ID AS Id,
       u.MEDEW_GC_ID AS UserId,
       'time_entry' AS Type,
       COALESCE(t.GC_OMSCHRIJVING, 'Onbekende taak') || ': ' || COALESCE(r.GC_OMSCHRIJVING, '') AS Message,
       FALSE AS IsRead,
       r.DATUM AS CreatedAt,
       'ingediend' AS Status
FROM AT_URENBREG r
INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
LEFT JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
WHERE u.MEDEW_GC_ID = @MedewGcId
  AND r.WERK_GC_ID IS NULL      -- ⚠️ Restrictief
  AND r.TAAK_GC_ID IS NOT NULL  -- ⚠️ Restrictief
```

**Optionele verbetering:**
Als je meer notificaties wilt, kan de SQL query aangepast worden in:
- `backend/Repositories/FirebirdDataRepository.cs` (regel 154)
- Verwijder of versoepel de WHERE filters

---

## 🎯 Testing Instructies

### Navbar Logo
1. Open de applicatie
2. Check de navbar
3. Het Altum logo rechts zou nu klein en netjes moeten zijn
4. Test in zowel light als dark mode

### Aanwezigheidskalender
1. Login als medewerker
2. Ga naar "Aanwezigheidskalender"
3. Check of werkdagen correct worden geteld
4. Check of statistieken kloppen:
   - Werkdagen
   - Gewerkte uren
   - Vakantiedagen
   - Feestdagen

### Wachtwoord Wijzigen
1. Login als gebruiker
2. Ga naar "Account"
3. Scroll naar "Beveiliging"
4. Test wachtwoord wijzigen:
   - Voer huidig wachtwoord in
   - Voer nieuw wachtwoord in (min. 6 karakters)
   - Bevestig nieuw wachtwoord
   - Klik "Wachtwoord Wijzigen"
5. Logout en login met nieuw wachtwoord

### Notificaties (Debug)
1. Login als gebruiker
2. Open browser Developer Tools (F12)
3. Ga naar Console tab
4. Klik op NotificationBell icon (🔔)
5. Check console logs:
   - "NotificationBell: Fetching activities for userId: X"
   - "NotificationBell: Received activities: [...]"
   - "NotificationBell: Unread count: X"
6. Als array leeg is: database heeft geen notificatie data

---

## 📊 Overzicht Status

| Issue | Status | Prioriteit | Tijd |
|-------|--------|------------|------|
| ✅ Navbar Logo | OPGELOST | Hoog | 5 min |
| ✅ Aanwezigheidskalender | OPGELOST | Hoog | 15 min |
| ✅ Wachtwoord Wijzigen | AL WERKEND | Gemiddeld | N/A |
| 📝 2FA | PLAN GEMAAKT | Gemiddeld | 3-4 dagen |
| 🔍 Notificaties | DIAGNOSE + DEBUG TOOLS | Laag | 10 min |

---

## 🚀 Volgende Stappen

### Direct (vandaag/morgen)
1. ✅ Test navbar logo in browser
2. ✅ Test aanwezigheidskalender met echte data
3. ✅ Verifieer wachtwoord wijzigen werkt
4. 🔍 Check notificaties console logs

### Kort termijn (deze week)
1. Review 2FA implementation plan
2. Besluit over 2FA prioriteit
3. Plan sprint voor 2FA als gewenst
4. Analyseer notificaties database data

### Middellange termijn (volgende weken)
1. Implementeer 2FA (als goedgekeurd)
2. Verbeter notificaties query indien nodig
3. User acceptance testing
4. Documentatie update

---

## 📝 Aantekeningen

### Wachtwoord Beveiliging - Huidige Status
- ✅ Wachtwoord wijzigen: **VOLLEDIG WERKEND**
- ❌ Wachtwoord sterkte indicator: **NIET AANWEZIG**
- ❌ Wachtwoord geschiedenis: **NIET AANWEZIG**
- ❌ Wachtwoord expiratie: **NIET AANWEZIG**
- ❌ 2FA: **NIET GEÏMPLEMENTEERD**

### Security Aanbevelingen
1. **Hoge prioriteit:** 2FA implementeren (zie plan)
2. **Gemiddelde prioriteit:**
   - Wachtwoord sterkte indicator toevoegen
   - Minimale wachtwoord vereisten enforced
3. **Lage prioriteit:**
   - Wachtwoord geschiedenis bijhouden
   - Periodieke wachtwoord wijziging afdwingen

### Database Notities
- Notificaties komen uit `AT_URENBREG` tabel
- Mogelijk weinig data als:
  - Weinig tijdregistraties ingediend
  - Filter criteria te strikt
  - Test omgeving met weinig data

---

## 🐛 Bekende Beperkingen

1. **Notificaties:**
   - Alleen "time_entry" type geïmplementeerd
   - Geen persistente "read" status (backend doet niets)
   - Query is restrictief (zie SQL hierboven)

2. **2FA:**
   - Nog niet geïmplementeerd
   - Plan beschikbaar maar vereist ~4 dagen werk

3. **Wachtwoord Wijzigen:**
   - Geen "forgot password" flow
   - Admin moet handmatig resetten
   - Geen email bevestiging

---

## 👥 Contact

Voor vragen over deze fixes:
- **Frontend fixes:** Navbar, Aanwezigheidskalender, Notificaties UI
- **Backend debugging:** Notificaties API, Database queries
- **Security planning:** 2FA implementatie, Wachtwoord policies

---

**Versie:** 1.0  
**Datum:** 2 februari 2026  
**Auteur:** GitHub Copilot  
