# Implementation Summary - Workflow System

## ✅ What's Been Completed (Backend)

### 1. Database Schema
- **File**: `backend/Migrations/001_CreateWorkflowTables.sql`
- **Table**: `time_entries_workflow`
- **Features**:
  - Draft/Submit/Approve/Reject workflow
  - Duplicate prevention via unique constraint
  - Audit trail (timestamps, reviewer tracking)
  - Auto-update trigger for `updated_at`

### 2. Models & DTOs
- **File**: `backend/Models/WorkflowModels.cs`
- **Classes**:
  - `TimeEntryWorkflow` - Entity model
  - `SaveDraftRequest`, `SubmitTimeEntriesRequest`, `ReviewTimeEntriesRequest`
  - `WorkflowEntryDto`, `DraftResponse`, `WorkflowResponse`
  - `WorkflowEntriesResponse`

### 3. Repository Layer
- **Interface**: `backend/Repositories/IWorkflowRepository.cs`
- **Implementation**: `backend/Repositories/PostgresWorkflowRepository.cs`
- **Methods**:
  - SaveDraftAsync (upsert logic for duplicates)
  - GetDraftsByEmployeeAsync
  - GetSubmittedByEmployeeAsync
  - GetAllSubmittedAsync (for managers)
  - GetRejectedByEmployeeAsync
  - FindDuplicateAsync
  - UpdateEntriesAsync
  - DeleteAsync

### 4. Service Layer
- **File**: `backend/Services/WorkflowService.cs`
- **Features**:
  - Draft saving with validation
  - Submit drafts for review
  - Manager approve/reject
  - Resubmit rejected entries
  - Copy approved entries to Firebird
  - Enrichment with Firebird data (task/project names)

### 5. API Endpoints
- **File**: `backend/Controllers/WorkflowController.cs`
- **Endpoints**:
  - `POST /api/workflow/draft` - Save draft
  - `GET /api/workflow/drafts` - Get drafts
  - `GET /api/workflow/submitted` - Get submitted
  - `GET /api/workflow/rejected` - Get rejected
  - `POST /api/workflow/submit` - Submit for review
  - `POST /api/workflow/resubmit` - Resubmit rejected
  - `DELETE /api/workflow/draft/{id}` - Delete draft
  - `GET /api/workflow/review/pending` - Manager pending list
  - `POST /api/workflow/review` - Manager approve/reject

### 6. Configuration
- **File**: `backend/appsettings.json`
- **Added**:
  - PostgreSQL connection string (Supabase)
  - AdminisGcId configuration

### 7. Dependency Injection
- **File**: `backend/Program.cs`
- **Registered**:
  - `IWorkflowRepository` → `PostgresWorkflowRepository`
  - `WorkflowService`

### 8. Database Context
- **File**: `backend/Infrastructure/PostgresDbContext.cs`
- **Added**:
  - `DbSet<TimeEntryWorkflow>`
  - Index configuration

### 9. Firebird Repository Extensions
- **File**: `backend/Repositories/FirebirdDataRepository.cs`
- **Added Methods**:
  - `IsValidTaakAsync`
  - `IsValidWerkAsync`
  - `IsValidUrenperAsync`
  - `GetWerkCodeAsync`

### 10. Migration Scripts
- **Bash**: `backend/run-migration.sh`
- **C#**: `backend/MigrationRunner.cs`

## 📋 How the System Works

### User Flow
```
1. User fills time entries
   ↓
2. Click "Opslaan" → Saves as DRAFT in PostgreSQL
   ↓
3. User can edit/delete drafts multiple times
   ↓
4. Click "Inleveren" → Status changes to SUBMITTED
   ↓
5. Entries locked, awaiting manager review
```

### Manager Flow
```
1. Manager views pending submissions
   ↓
2. Reviews entries grouped by employee
   ↓
3. Clicks "Goedkeuren" or "Afkeuren"
   ↓
4a. If APPROVED → Copy to Firebird AT_URENBREG
4b. If REJECTED → Back to user with reason
```

### Duplicate Prevention
- **Unique constraint**: medew_gc_id + datum + taak_gc_id + werk_gc_id + urenper_gc_id
- **Applies to**: DRAFT and SUBMITTED entries only
- **Behavior**: If duplicate found → UPDATE existing instead of INSERT new

## 🔧 Configuration Details

### Supabase Connection
```
Host: db.ynajasnxfvgtlbjatlbw.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: Kj9QIapHHgKUlguF
```

### Connection String (in appsettings.json)
```
Host=db.ynajasnxfvgtlbjatlbw.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=Kj9QIapHHgKUlguF;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;
```

## 🚀 Next Steps (What Still Needs to Be Done)

### 1. Run Migration
On your RDP:
```bash
cd C:\Users\Ayoub\Desktop\clockwise-project\backend
dotnet run migrate
```

OR manually in Supabase SQL Editor:
- Copy contents of `backend/Migrations/001_CreateWorkflowTables.sql`
- Run in Supabase dashboard

### 2. Restart Backend
```bash
cd C:\Users\Ayoub\Desktop\clockwise-project\backend
dotnet run
```

### 3. Frontend Implementation (TODO)

#### Update Register Time Page
**File**: `frontend/app/(dashboard)/register-time/page.tsx`

**Changes Needed**:
1. Replace current "Opslaan" button with:
   - **Opslaan button** → Calls `POST /api/workflow/draft`
   - **Inleveren button** → Calls `POST /api/workflow/submit`

2. Add draft display section:
   - Show list of drafts for current period
   - Edit button → loads draft into form
   - Delete button → calls `DELETE /api/workflow/draft/{id}`
   - Checkbox to select multiple
   - "Alles Inleveren" button → submits all selected

3. Add rejected section:
   - Show rejected entries with rejection reason
   - Edit + Resubmit functionality

#### Create Manager Review Page
**File**: `frontend/app/(dashboard)/review-time/page.tsx` (NEW)

**Features**:
1. Period selector
2. List of submitted entries grouped by employee
3. Checkboxes for bulk selection
4. Employee info display
5. Approve button (green)
6. Reject button (red) with reason modal
7. Total hours display per employee

### 4. Frontend API Client
**File**: `frontend/lib/api/workflowApi.ts` (NEW)

**Functions Needed**:
```typescript
export async function saveDraft(data: SaveDraftRequest)
export async function getDrafts(urenperGcId: number)
export async function getSubmitted(urenperGcId: number)
export async function getRejected(urenperGcId: number)
export async function submitEntries(data: SubmitTimeEntriesRequest)
export async function resubmitRejected(data: SubmitTimeEntriesRequest)
export async function deleteDraft(id: number)
export async function getPendingReview(urenperGcId: number)
export async function reviewEntries(data: ReviewTimeEntriesRequest)
```

### 5. Navigation Update
**File**: `frontend/components/Sidebar.tsx`

**Add**:
```typescript
{
  href: "/review-time",
  label: t("nav.reviewTime"),
  icon: CheckCircleIcon,
  description: t("nav.reviewTimeDescription"),
  roles: ["MANAGER"] // Only show for managers
}
```

## 📊 Database Schema Reference

### time_entries_workflow

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| medew_gc_id | INTEGER | Employee ID (from AT_MEDEW) |
| urenper_gc_id | INTEGER | Period ID (from AT_URENPER) |
| taak_gc_id | INTEGER | Task ID (from AT_TAAK) |
| werk_gc_id | INTEGER | Project ID (from AT_WERK, nullable) |
| datum | DATE | Entry date |
| aantal | DECIMAL(5,2) | Hours worked (0.1-23.9) |
| omschrijving | TEXT | Description |
| **status** | VARCHAR(20) | DRAFT, SUBMITTED, APPROVED, REJECTED |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | Last updated (auto) |
| submitted_at | TIMESTAMP | When submitted |
| reviewed_at | TIMESTAMP | When reviewed |
| reviewed_by | INTEGER | Manager ID |
| rejection_reason | TEXT | Why rejected (if rejected) |
| firebird_gc_id | INTEGER | Link to AT_URENBREG.GC_ID after approval |

### Indexes
- medew_gc_id
- status
- datum
- urenper_gc_id
- (medew_gc_id, status) WHERE status = 'SUBMITTED'
- Unique: (medew_gc_id, datum, taak_gc_id, werk_gc_id, urenper_gc_id) WHERE status IN ('DRAFT', 'SUBMITTED')

## ✅ Testing Checklist

### Backend API Tests (Using Postman/curl)

1. **Save Draft**
```bash
curl -X POST http://localhost:5000/api/workflow/draft \
  -H "Content-Type: application/json" \
  -H "X-MEDEW-GC-ID: 1" \
  -d '{
    "urenperGcId": 1,
    "taakGcId": 30,
    "werkGcId": 1,
    "datum": "2025-12-23",
    "aantal": 8.0,
    "omschrijving": "Test entry"
  }'
```

2. **Get Drafts**
```bash
curl -X GET "http://localhost:5000/api/workflow/drafts?urenperGcId=1" \
  -H "X-MEDEW-GC-ID: 1"
```

3. **Submit Entries**
```bash
curl -X POST http://localhost:5000/api/workflow/submit \
  -H "Content-Type: application/json" \
  -H "X-MEDEW-GC-ID: 1" \
  -d '{
    "urenperGcId": 1,
    "entryIds": [1, 2]
  }'
```

4. **Manager Review**
```bash
curl -X POST http://localhost:5000/api/workflow/review \
  -H "Content-Type: application/json" \
  -H "X-MEDEW-GC-ID: 100" \
  -d '{
    "entryIds": [1, 2],
    "approve": true
  }'
```

### Frontend Tests (Manual)

1. ✅ Save draft → appears in drafts list
2. ✅ Edit draft → updates correctly
3. ✅ Delete draft → removed from list
4. ✅ Submit drafts → moves to submitted list
5. ✅ Manager approves → appears in Firebird database
6. ✅ Manager rejects → back in user's rejected list with reason
7. ✅ User resubmits → back in submitted list
8. ✅ Duplicate prevention → update instead of create

## 📝 Notes

- **NO database changes to Firebird** - All workflow in PostgreSQL
- **Firebird is read-only until approval** - Only approved entries get inserted
- **Supabase free tier** - 500MB database, enough for workflow data
- **Backend runs on RDP** - Connects to both Firebird (local) and Supabase (cloud)
- **Frontend on Vercel** - Calls backend via ngrok URL

## 🔐 Security Considerations

1. **Connection string** contains password → Keep secure
2. **Add manager role check** in ReviewEntries endpoint
3. **Consider environment variables** for production
4. **Add `.gitignore`** for appsettings.json if public repo

---

**Status**: Backend implementation complete ✅  
**Next**: Frontend implementation + Testing  
**Created**: 2025-12-22
