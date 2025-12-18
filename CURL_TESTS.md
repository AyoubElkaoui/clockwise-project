# Clockwise API - Curl Test Suite

## Voorwaarden
- Backend draait op `http://localhost:5000` OF via ngrok
- Gebruik `X-MEDEW-GC-ID` header voor authenticatie
- Test user: `100050` (normale medewerker)
- Test manager: `100002` (manager/admin)

## 1. TIME ENTRIES - Draft Save (Uren opslaan als concept)

```bash
curl -X POST http://localhost:5000/api/time-entries/work \
  -H "Content-Type: application/json" \
  -H "X-MEDEW-GC-ID: 100050" \
  -d '{
    "UrenperGcId": 100001,
    "Regels": [
      {
        "TaakGcId": 100256,
        "WerkGcId": 100025,
        "Aantal": 8.0,
        "Datum": "2024-12-19",
        "GcOmschrijving": "Test entry via curl",
        "KostsrtGcId": null,
        "BestparGcId": null
      }
    ],
    "ClientRequestId": "test-12345"
  }'
```

**Verwacht:** HTTP 200, response: `"Work entries inserted successfully"`

**Verificatie:**
```bash
curl -X GET "http://localhost:5000/api/time-entries?from=2024-12-01&to=2024-12-31" \
  -H "X-MEDEW-GC-ID: 100050"
```

---

## 2. TIME ENTRIES - Read (Uren ophalen)

```bash
curl -X GET "http://localhost:5000/api/time-entries?from=2024-10-01&to=2024-12-31" \
  -H "X-MEDEW-GC-ID: 100050" \
  -H "ngrok-skip-browser-warning: 1"
```

**Verwacht:**
- HTTP 200
- JSON met `Entries` array
- Elk entry bevat `MedewGcId: 100050`
- Elk entry bevat `Aantal` (hours as decimal)
- Elk entry bevat `Datum`, `ProjectCode`, `TaskName`

**Voorbeeld response:**
```json
{
  "Entries": [
    {
      "DocumentGcId": 123,
      "TaakGcId": 100256,
      "WerkGcId": 100025,
      "MedewGcId": 100050,
      "Datum": "2024-12-19T00:00:00",
      "Aantal": 8.0,
      "ProjectCode": "PROJ001",
      "ProjectName": "Test Project",
      "TaskName": "Montage",
      "Description": "Test entry"
    }
  ],
  "Projects": [...],
  "ProjectGroups": [...],
  "Companies": []
}
```

---

## 3. PROJECTS - Lijst ophalen

```bash
curl -X GET "http://localhost:5000/api/projects" \
  -H "X-MEDEW-GC-ID: 100050"
```

**Verwacht:** HTTP 200, array met projects met `GcId`, `GcCode`, `WerkgrpGcId`

---

## 4. TASKS - Work tasks ophalen

```bash
curl -X GET "http://localhost:5000/api/tasks/work" \
  -H "X-MEDEW-GC-ID: 100050"
```

**Verwacht:** HTTP 200, tasks met code "30" (Montage) en "40" (Tekenkamer)

---

## 5. PERIODS - Periodes ophalen

```bash
curl -X GET "http://localhost:5000/api/periods?count=10" \
  -H "X-MEDEW-GC-ID: 100050"
```

**Verwacht:** HTTP 200, array met periodes (URENPER)

---

## Verwachte Backend Logs

Bij succesvolle POST `/time-entries/work`:

```
[INFO] InsertWorkEntriesAsync START: medewGcId=100050, UrenperGcId=100001, Regels=1
[INFO] Validating medew 100050 is active
[INFO] IsMedewActiveAsync: medewGcId=100050, exists=True
[INFO] Using AdminisGcId=1, validating UrenperGcId=100001
[INFO] Validating 1 regels
[INFO] No existing document found for medew 100050, creating new URS document
[INFO] Created new document with GcId=12345
[INFO] Starting regel insertion at GcRegelNr=1
[INFO] InsertWorkEntriesAsync SUCCESS: Committed 1 work entries for document 12345
```

Bij fouten:
```
[ERROR] Invalid UrenperGcId=999 for AdminisGcId=1
[ERROR] Invalid WerkGcId: 999
[ERROR] Invalid taak code 'Z1' for work entries (must be 30 or 40)
```

---

## Frontend Verificatie

Open browser console op `/uren-overzicht` en check:

```javascript
// Console logs moeten tonen:
getEnrichedTimeEntries - entries: [
  { userId: 100050, hours: 8, date: "2024-12-19", ... }
]

// NIET meer:
{ userId: 0, ... }  // ❌ Bug was: userId was altijd 0
```

UI moet tonen:
- **Deze week:** X uren (niet meer "0u")
- **Deze maand:** Y uren (niet meer "0u")
- Entries in tabel met correcte datums

---

## Troubleshooting

### Error: "Column unknown ACTIEF_JN"
**FIX:** ACTIEF_JN bestaat NIET in AT_MEDEW. Verwijder alle `AND ACTIEF_JN = 'J'` uit queries die AT_MEDEW aanroepen.

### Error: "Invalid input" bij POST
**CHECK:**
1. Is `UrenperGcId` valid? (moet bestaan in AT_URENPER)
2. Is `TaakGcId` valid? (100256 voor Montage, 100032 voor Tekenkamer)
3. Is `WerkGcId` valid? (moet bestaan in AT_WERK)
4. Is `Aantal` tussen 0 en 24?
5. Is `Datum` niet default (moet echte datum zijn)?

**Logs bekijken:**
```bash
# Backend logs tonen exact welke validatie faalt
docker logs clockwise-backend -f
```

### Frontend toont "0 uren" ondanks backend entries
**CHECK:**
1. Backend response bevat `MedewGcId` in entries? ✓
2. Frontend `transformTimeEntries()` mapt `entry.MedewGcId` naar `userId`? ✓
3. Frontend filtert `entries.filter(e => e.userId === getUserId())`? ✓
4. `localStorage.getItem('medewGcId')` = `getUserId()`? ✓

---

## Next Steps (TODO)

### Vacation Endpoints (via AT_TAAK)
```bash
# GET vacation requests
curl -X GET "http://localhost:5000/api/vacations" \
  -H "X-MEDEW-GC-ID: 100050"

# POST vacation request (niet geïmplementeerd yet)
```

### Manager Approvals (user 100002)
```bash
# GET pending approvals
curl -X GET "http://localhost:5000/api/approvals/time-entries?status=pending" \
  -H "X-MEDEW-GC-ID: 100002"

# POST approve entry
curl -X POST "http://localhost:5000/api/approvals/time-entries/123/approve" \
  -H "X-MEDEW-GC-ID: 100002"

# POST reject entry
curl -X POST "http://localhost:5000/api/approvals/time-entries/123/reject" \
  -H "X-MEDEW-GC-ID: 100002"
```

---

## Verificatie Checklist

- [ ] POST /time-entries/work geeft HTTP 200 (niet 500)
- [ ] GET /time-entries returnt entries met `MedewGcId`
- [ ] Frontend console toont `userId: 100050` (niet 0)
- [ ] UI toont "8u deze week" (niet "0u")
- [ ] Backend logs tonen "SUCCESS: Committed X entries"
- [ ] Geen "ACTIEF_JN" SQL errors meer
- [ ] Geen "Invalid input" zonder duidelijke reden

