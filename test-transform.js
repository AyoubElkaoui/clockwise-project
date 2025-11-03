// Test transformatie van API data
const entry = {
  "id": 1,
  "userId": 1,
  "startTime": "2025-09-22T08:38:00",
  "endTime": "2025-09-22T14:38:00",
  "breakMinutes": 56,
  "projectId": 30,
  "project": {
    "name": "Project-002 - Inspectie Groningen",
    "projectGroupId": 3,
    "projectGroup": {
      "name": "200 Project",
      "companyId": 2,
      "company": {
        "name": "Elmar International"
      }
    }
  },
  "distanceKm": 56,
  "expenses": 0,
  "notes": "",
  "status": "ingeleverd"
};

// Calculate hours
const start = new Date(entry.startTime);
const end = new Date(entry.endTime);
const diffMs = end.getTime() - start.getTime();
const diffMinutes = diffMs / (1000 * 60);
const workMinutes = diffMinutes - (entry.breakMinutes || 0);
const hours = workMinutes > 0 ? workMinutes / 60 : 0;

// Extract date
const date = entry.startTime ? entry.startTime.split('T')[0] : '';

const transformed = {
  id: entry.id,
  userId: entry.userId,
  date: date,
  projectId: entry.projectId,
  projectName: entry.project?.name || '',
  projectGroupId: entry.project?.projectGroupId || 0,
  projectGroupName: entry.project?.projectGroup?.name || '',
  companyId: entry.project?.projectGroup?.companyId || 0,
  companyName: entry.project?.projectGroup?.company?.name || '',
  hours: parseFloat(hours.toFixed(2)),
  km: entry.distanceKm || 0,
  expenses: entry.expenses || 0,
  breakMinutes: entry.breakMinutes || 0,
  notes: entry.notes || '',
  status: entry.status || 'opgeslagen',
  startTime: entry.startTime,
  endTime: entry.endTime,
};

console.log(JSON.stringify(transformed, null, 2));
