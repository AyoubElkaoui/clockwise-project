# Database Migration Instructions

## Quick Start - Run Migration via Supabase Dashboard

**Eenvoudigste methode (aanbevolen):**

1. Open je browser en ga naar: https://supabase.com/dashboard/project/ynajasnxfvgtlbjatlbw/sql/new

2. Login met je Supabase account

3. Open het bestand `backend/Migrations/001_CreateWorkflowTables.sql` in een text editor

4. Kopieer de VOLLEDIGE inhoud van dat bestand

5. Plak het in de SQL editor in Supabase

6. Klik op de groene "Run" knop rechtsboven

7. Je zou moeten zien: "Success. No rows returned"

8. ✅ Klaar! De migratie is nu uitgevoerd.

## Verificatie

Om te controleren of de migratie succesvol was, voer deze query uit in de Supabase SQL editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'time_entries_workflow';
```

Als de tabel bestaat, zie je: `time_entries_workflow` in de resultaten.

Je kunt ook testen met:

```sql
SELECT * FROM time_entries_workflow LIMIT 1;
```

Dit zou een lege tabel moeten tonen (geen errors).

## Backend Starten

Na het uitvoeren van de migratie:

```bash
cd backend
dotnet run
```

De backend zou nu moeten starten op http://localhost:5000 zonder errors.

## Alternatieve Methode (via psql op RDP)

Als je psql hebt geïnstalleerd op je RDP machine:

```bash
cd C:\Users\Ayoub\Desktop\clockwise-project\backend
.\run-migration.sh
```

Of handmatig:

```bash
$env:PGPASSWORD="Kj9QIapHHgKUlguF"
psql -h db.ynajasnxfvgtlbjatlbw.supabase.co -p 5432 -U postgres -d postgres -f Migrations/001_CreateWorkflowTables.sql
```

## Troubleshooting

### Error: "relation already exists"
Dit betekent dat de migratie al is uitgevoerd. Dit is geen probleem - de workflow is al klaar.

### Error: "connection refused"
Check of:
- Je internet connectie werkt
- Supabase project is actief
- De connection string klopt

### Error: "authentication failed"
Het wachtwoord is mogelijk gewijzigd. Check de connection string in `backend/appsettings.json`.

## What This Migration Does

De migratie maakt de volgende tabel aan:

- **Table**: `time_entries_workflow`
- **Purpose**: Opslaan van draft, submitted, approved, en rejected time entries
- **Indexes**: Voor snelle queries op employee, status, datum
- **Triggers**: Auto-update timestamp
- **Constraints**: Voorkomt duplicates voor zelfde dag/taak/project

## Next Steps

Na succesvolle migratie:

1. ✅ Backend starten met `dotnet run`
2. ✅ Frontend builden met `npm run build` 
3. ✅ Testen van de workflow:
   - Save draft
   - Submit entries
   - Manager review (approve/reject)
4. ✅ Deploy naar Vercel

---

**Created**: 2025-12-22  
**Migration File**: `backend/Migrations/001_CreateWorkflowTables.sql`  
**Supabase Project**: ynajasnxfvgtlbjatlbw
