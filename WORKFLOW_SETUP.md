# Time Entry Workflow Setup Guide

This document explains how to set up and use the new time entry workflow system (draft/submit/approve).

## What's New

The workflow system allows:
1. **Users** to save time entries as **drafts** (can still edit)
2. **Users** to **submit** drafts for manager review (locked)
3. **Managers** to **approve** or **reject** submitted entries
4. **Approved** entries are automatically copied to Firebird database
5. **Rejected** entries go back to user for revision

## Architecture

- **Firebird** = Final approved data (AT_URENBREG)
- **PostgreSQL (Supabase)** = Workflow layer (drafts, submissions, reviews)

```
User fills hours → Save as DRAFT (PostgreSQL)
                ↓
              Edit/Delete drafts
                ↓
              Submit (SUBMITTED status)
                ↓
              Manager reviews
                ↓
        Approve ←→ Reject
           ↓           ↓
    Copy to Firebird  Back to user
    (APPROVED)        (REJECTED)
```

## Setup Instructions

### 1. Database Migration

Run the migration to create the workflow table in Supabase:

**Option A: Using bash script (Linux/Mac)**
```bash
cd backend
./run-migration.sh
```

**Option B: Using C# runner**
```bash
cd backend
dotnet run migrate
```

**Option C: Manual (Supabase Dashboard)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy contents of `backend/Migrations/001_CreateWorkflowTables.sql`
5. Paste and run

### 2. Verify Migration

Check if table was created:
```sql
SELECT * FROM time_entries_workflow LIMIT 1;
```

### 3. Restart Backend

On your RDP:
```bash
cd C:\Users\Ayoub\Desktop\clockwise-project\backend
dotnet run
```

The backend should now connect to both:
- Firebird (localhost) for final data
- Supabase (cloud) for workflow

## API Endpoints

### User Endpoints

**Save Draft**
```http
POST /api/workflow/draft
Content-Type: application/json
X-MEDEW-GC-ID: {employee_id}

{
  "urenperGcId": 1,
  "taakGcId": 30,
  "werkGcId": 1,
  "datum": "2025-12-22",
  "aantal": 8.0,
  "omschrijving": "Development work"
}
```

**Get Drafts**
```http
GET /api/workflow/drafts?urenperGcId=1
X-MEDEW-GC-ID: {employee_id}
```

**Get Rejected (need revision)**
```http
GET /api/workflow/rejected?urenperGcId=1
X-MEDEW-GC-ID: {employee_id}
```

**Submit for Review**
```http
POST /api/workflow/submit
Content-Type: application/json
X-MEDEW-GC-ID: {employee_id}

{
  "urenperGcId": 1,
  "entryIds": [1, 2, 3]
}
```

**Delete Draft**
```http
DELETE /api/workflow/draft/{id}
X-MEDEW-GC-ID: {employee_id}
```

### Manager Endpoints

**Get Pending Reviews**
```http
GET /api/workflow/review/pending?urenperGcId=1
X-MEDEW-GC-ID: {manager_id}
```

**Approve Entries**
```http
POST /api/workflow/review
Content-Type: application/json
X-MEDEW-GC-ID: {manager_id}

{
  "entryIds": [1, 2, 3],
  "approve": true
}
```

**Reject Entries**
```http
POST /api/workflow/review
Content-Type: application/json
X-MEDEW-GC-ID: {manager_id}

{
  "entryIds": [1, 2],
  "approve": false,
  "rejectionReason": "Missing project details"
}
```

## Frontend Integration

### User Flow

1. **Register Time Page** (updated)
   - Save button → Saves as DRAFT (can edit multiple times)
   - Submit button → Submits all drafts for review
   - Shows draft count, rejected count

2. **My Drafts Section**
   - List of draft entries
   - Edit/Delete buttons
   - Select all + Submit button

3. **Rejected Section**
   - List of rejected entries with reasons
   - Edit + Resubmit functionality

### Manager Flow

1. **Review Time Page** (new)
   - List of all submitted entries grouped by employee
   - Checkboxes to select entries
   - Approve/Reject buttons
   - Rejection reason input

## Database Schema

### time_entries_workflow table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| medew_gc_id | INTEGER | Employee ID |
| urenper_gc_id | INTEGER | Period ID |
| taak_gc_id | INTEGER | Task ID |
| werk_gc_id | INTEGER | Project ID (nullable) |
| datum | DATE | Entry date |
| aantal | DECIMAL | Hours |
| omschrijving | TEXT | Description |
| **status** | VARCHAR(20) | DRAFT, SUBMITTED, APPROVED, REJECTED |
| created_at | TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP | Updated timestamp |
| submitted_at | TIMESTAMP | When submitted |
| reviewed_at | TIMESTAMP | When reviewed |
| reviewed_by | INTEGER | Manager ID |
| rejection_reason | TEXT | Why rejected |
| firebird_gc_id | INTEGER | Link to AT_URENBREG after approval |

### Workflow Statuses

- **DRAFT**: User can edit/delete
- **SUBMITTED**: Locked, awaiting manager review
- **APPROVED**: Copied to Firebird, shown in history
- **REJECTED**: User must revise and resubmit

## Duplicate Prevention

The system prevents duplicates using a unique constraint:
- Same employee + date + task + project + period
- Only applies to DRAFT and SUBMITTED entries
- If duplicate found → **updates existing** instead of creating new

This solves the problem where users could create multiple entries for the same day/task.

## Connection Strings

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "Postgres": "Host=db.ynajasnxfvgtlbjatlbw.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=Kj9QIapHHgKUlguF;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;"
  }
}
```

### Supabase Dashboard
- **Host**: db.ynajasnxfvgtlbjatlbw.supabase.co
- **Port**: 5432
- **Database**: postgres
- **User**: postgres
- **Password**: Kj9QIapHHgKUlguF

## Troubleshooting

### Backend won't start
```
Error: Npgsql.NpgsqlException: Connection refused
```
**Fix**: Check if Supabase connection string is correct in appsettings.json

### Table doesn't exist
```
Error: relation "time_entries_workflow" does not exist
```
**Fix**: Run the migration script

### Duplicate entry error
```
Error: duplicate key value violates unique constraint
```
**Fix**: This is expected! The system will automatically update the existing draft instead.

### SSL Connection error
```
Error: SSL connection required
```
**Fix**: Make sure connection string has `SSL Mode=Require;Trust Server Certificate=true;`

## Next Steps

1. ✅ Run migration on Supabase
2. ✅ Restart backend on RDP
3. ⏳ Update frontend register-time page
4. ⏳ Create manager review page
5. ⏳ Test complete workflow

## Security Notes

- Connection string contains password → **Keep appsettings.json secure**
- Add to `.gitignore` if committing to public repo
- Consider using environment variables for production:
  ```bash
  export ConnectionStrings__Postgres="Host=...Password=..."
  ```

## Support

If you encounter issues:
1. Check backend logs for detailed errors
2. Verify Supabase project is active
3. Test connection using psql or pgAdmin
4. Check if migration ran successfully

---

**Created**: 2025-12-22
**Version**: 1.0
