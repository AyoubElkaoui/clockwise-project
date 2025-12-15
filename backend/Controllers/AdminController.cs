using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/admin")]
[ApiController]
public class AdminController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public AdminController(ClockwiseDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Haal statistieken op voor het admin dashboard
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalCompanies = await _context.Companies.CountAsync();
        var totalProjects = await _context.Projects.CountAsync();

        // Haal alle time entries op en bereken uren in code (niet in de database)
        var timeEntries = await _context.TimeEntries.ToListAsync();
        var totalHours = timeEntries.Sum(te =>
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));

        // Bereken uren deze maand
        var now = DateTime.Now;
        var thisMonth = now.Month;
        var thisYear = now.Year;
        var entriesThisMonth = timeEntries.Where(te =>
            te.StartTime.Month == thisMonth && te.StartTime.Year == thisYear);
        var hoursThisMonth = entriesThisMonth.Sum(te =>
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));

        // Vorige maand
        var lastMonth = now.AddMonths(-1);
        var entriesLastMonth = timeEntries.Where(te =>
            te.StartTime.Month == lastMonth.Month && te.StartTime.Year == lastMonth.Year);
        var hoursLastMonth = entriesLastMonth.Sum(te =>
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));

        // Laatste week (7 dagen)
        var sevenDaysAgo = now.AddDays(-7);
        var entriesLastWeek = timeEntries.Where(te => te.StartTime >= sevenDaysAgo);
        var hoursLastWeek = entriesLastWeek.Sum(te =>
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));
        var usersLastWeek = entriesLastWeek.Select(te => te.UserId).Distinct().Count();
        var projectsLastWeek = entriesLastWeek.Select(te => te.ProjectId).Distinct().Count();

        // Aantal actieve projecten (met uren in laatste 30 dagen)
        var thirtyDaysAgo = now.AddDays(-30);
        var activeProjects = timeEntries
            .Where(te => te.StartTime >= thirtyDaysAgo)
            .Select(te => te.ProjectId)
            .Distinct()
            .Count();

        // Vakantie-aanvragen in behandeling
        var pendingVacations = await _context.VacationRequests
            .CountAsync(vr => vr.Status == "pending");

        // Pending approvals (time entries)
        var pendingApprovals = timeEntries.Count(te => te.Status == "ingeleverd");

        // Completion rate deze maand
        var totalEntriesThisMonth = entriesThisMonth.Count();
        var completedEntriesThisMonth = entriesThisMonth.Count(te => te.Status == "goedgekeurd");
        var completionRate = totalEntriesThisMonth > 0 ? (double)completedEntriesThisMonth / totalEntriesThisMonth * 100 : 0;

        // Actieve gebruikers deze maand
        var activeUsersThisMonth = entriesThisMonth.Select(te => te.UserId).Distinct().Count();

        // Gemiddeld uren per gebruiker deze maand
        var avgHoursPerUser = activeUsersThisMonth > 0 ? hoursThisMonth / activeUsersThisMonth : 0;

        // System health (dummy voor nu, kan later echte checks toevoegen)
        var systemHealth = 98; // Placeholder

        return new
        {
            totalUsers,
            totalCompanies,
            totalProjects,
            totalHours,
            hoursThisMonth,
            hoursLastMonth,
            hoursLastWeek,
            usersLastWeek,
            projectsLastWeek,
            activeProjects,
            pendingVacations,
            pendingApprovals,
            completionRate,
            activeUsersThisMonth,
            avgHoursPerUser,
            systemHealth
        };
    }

    /// <summary>
    /// Haal systeem status op voor monitoring
    /// </summary>
    [HttpGet("system-status")]
    public async Task<ActionResult<IEnumerable<object>>> GetSystemStatus()
    {
        // Placeholder voor echte health checks - kan later uitgebreid worden met database connectivity, etc.
        var systemComponents = new[]
        {
            new
            {
                id = 1,
                component = "API Server",
                status = "operational",
                uptime = "99.9%",
                responseTime = "24ms"
            },
            new
            {
                id = 2,
                component = "Database",
                status = "operational",
                uptime = "99.8%",
                responseTime = "12ms"
            },
            new
            {
                id = 3,
                component = "Bestandsopslag",
                status = "operational",
                uptime = "99.9%",
                responseTime = "45ms"
            },
            new
            {
                id = 4,
                component = "E-mail Service",
                status = "degraded",
                uptime = "97.2%",
                responseTime = "120ms"
            }
        };

        return systemComponents;
    }

    /// <summary>
    /// Haal dashboard health op: Firebird connectie, latency, laatste error
    /// </summary>
    [HttpGet("dashboard/health")]
    public async Task<ActionResult<object>> GetDashboardHealth()
    {
        var startTime = DateTime.UtcNow;
        try
        {
            // Simpele health check query naar Firebird
            var testQuery = await _context.Users.CountAsync();
            var latency = (DateTime.UtcNow - startTime).TotalMilliseconds;

            return new
            {
                databaseStatus = "connected",
                latencyMs = Math.Round(latency, 2),
                lastError = (string)null,
                timestamp = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            var latency = (DateTime.UtcNow - startTime).TotalMilliseconds;
            return new
            {
                databaseStatus = "disconnected",
                latencyMs = Math.Round(latency, 2),
                lastError = ex.Message,
                timestamp = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Haal actieve signaleringen op voor dashboard
    /// </summary>
    [HttpGet("dashboard/alerts")]
    public async Task<ActionResult<IEnumerable<object>>> GetDashboardAlerts()
    {
        var now = DateTime.Now;
        var sevenDaysAgo = now.AddDays(-7);

        // Medewerkers zonder uren deze week
        var usersWithoutHours = await _context.Users
            .Where(u => !_context.TimeEntries.Any(te => te.UserId == u.Id && te.StartTime >= sevenDaysAgo))
            .Select(u => new { u.Id, FullName = $"{u.FirstName} {u.LastName}" })
            .ToListAsync();

        // Registraties met >24 uur per dag
        var allTimeEntries = await _context.TimeEntries
            .Include(te => te.User)
            .Where(te => te.User != null)
            .ToListAsync();

        var excessiveHours = allTimeEntries
            .Where(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0) > 24)
            .Select(te => new
            {
                te.Id,
                User = string.IsNullOrWhiteSpace($"{te.User.FirstName} {te.User.LastName}".Trim()) ? $"Gebruiker {te.User.Id}" : $"{te.User.FirstName} {te.User.LastName}".Trim(),
                Date = te.StartTime.Date,
                Hours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)
            })
            .ToList();

        var alerts = new List<object>();

        foreach (var user in usersWithoutHours)
        {
            alerts.Add(new
            {
                id = $"no-hours-{user.Id}",
                type = "missing_hours",
                severity = "warning",
                message = $"{user.FullName} heeft geen uren geregistreerd deze week",
                target = user.Id,
                timestamp = now
            });
        }

        foreach (var entry in excessiveHours)
        {
            alerts.Add(new
            {
                id = $"excessive-{entry.Id}",
                type = "excessive_hours",
                severity = "error",
                message = $"{entry.User} heeft {entry.Hours:F1} uur geregistreerd op {entry.Date:dd-MM-yyyy} (>24 uur)",
                target = entry.Id,
                timestamp = now
            });
        }

        return alerts;
    }

    /// <summary>
    /// Haal overzicht van alle medewerkers
    /// </summary>
    [HttpGet("employees")]
    public async Task<ActionResult<IEnumerable<object>>> GetEmployees(
        [FromQuery] string? search = null,
        [FromQuery] string? department = null,
        [FromQuery] bool? active = null)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u => (u.FirstName + " " + u.LastName).Contains(search));
        }

        if (!string.IsNullOrEmpty(department))
        {
            query = query.Where(u => u.Department == department);
        }

        if (active.HasValue)
        {
            query = query.Where(u => u.IsActive == active.Value);
        }

        var employees = await query
            .OrderBy(u => u.LastName)
            .Select(u => new
            {
                u.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                u.Email,
                u.Department,
                Role = u.Rank,
                u.IsActive,
                LastActivity = _context.TimeEntries
                    .Where(te => te.UserId == u.Id)
                    .OrderByDescending(te => te.StartTime)
                    .Select(te => te.StartTime)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return employees;
    }

    /// <summary>
    /// Haal detail van een specifieke medewerker
    /// </summary>
    [HttpGet("employees/{id}")]
    public async Task<ActionResult<object>> GetEmployeeDetail(int id)
    {
        var employee = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                u.Email,
                u.Department,
                Role = u.Rank,
                u.IsActive,
                u.Address,
                u.City,
                u.PostalCode,
                u.Phone,
                HireDate = u.CreatedAt,
                LastActivity = _context.TimeEntries
                    .Where(te => te.UserId == u.Id)
                    .OrderByDescending(te => te.StartTime)
                    .Select(te => te.StartTime)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        if (employee == null) return NotFound();

        // Aggregated hours this month
        var now = DateTime.Now;
        var thisMonth = _context.TimeEntries
            .Where(te => te.UserId == id && te.StartTime.Month == now.Month && te.StartTime.Year == now.Year)
            .AsEnumerable()
            .Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));

        var avgPerDay = thisMonth / DateTime.DaysInMonth(now.Year, now.Month);

        return new
        {
            employee.Id,
            employee.FullName,
            employee.Email,
            employee.Department,
            employee.Role,
            employee.IsActive,
            employee.Address,
            employee.City,
            employee.PostalCode,
            employee.Phone,
            employee.HireDate,
            employee.LastActivity,
            HoursThisMonth = Math.Round(thisMonth, 2),
            AvgHoursPerDay = Math.Round(avgPerDay, 2)
        };
    }

    /// <summary>
    /// Haal uren historie voor een medewerker
    /// </summary>
    [HttpGet("employees/{id}/hours")]
    public async Task<ActionResult<IEnumerable<object>>> GetEmployeeHours(int id, [FromQuery] string period = "month")
    {
        var now = DateTime.Now;
        DateTime startDate;

        switch (period.ToLower())
        {
            case "week":
                startDate = now.AddDays(-7);
                break;
            case "month":
                startDate = new DateTime(now.Year, now.Month, 1);
                break;
            case "year":
                startDate = new DateTime(now.Year, 1, 1);
                break;
            default:
                startDate = new DateTime(now.Year, now.Month, 1);
                break;
        }

        var entries = await _context.TimeEntries
            .Where(te => te.UserId == id && te.StartTime >= startDate)
            .Include(te => te.Project)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        var hours = entries.Select(te => new
        {
            te.Id,
            Date = te.StartTime.Date,
            StartTime = te.StartTime,
            EndTime = te.EndTime,
            Hours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0),
            te.BreakMinutes,
            Project = te.Project?.Name ?? "Unknown",
            te.Status,
            te.Notes
        }).ToList();

        return hours;
    }

    /// <summary>
    /// Haal geaggregeerde uren data
    /// </summary>
    [HttpGet("time-entries/aggregates")]
    public async Task<ActionResult<IEnumerable<object>>> GetTimeEntriesAggregates(
        [FromQuery] string groupBy = "employee",
        [FromQuery] string period = "month")
    {
        var now = DateTime.Now;
        DateTime startDate;

        switch (period.ToLower())
        {
            case "week":
                startDate = now.AddDays(-7);
                break;
            case "month":
                startDate = new DateTime(now.Year, now.Month, 1);
                break;
            case "year":
                startDate = new DateTime(now.Year, 1, 1);
                break;
            default:
                startDate = new DateTime(now.Year, now.Month, 1);
                break;
        }

        if (groupBy == "employee")
        {
            var timeEntries = await _context.TimeEntries
                .Where(te => te.StartTime >= startDate)
                .Include(te => te.User)
                .Where(te => te.User != null)
                .ToListAsync();

            var aggregates = timeEntries
                .GroupBy(te => new { te.UserId, te.User.FirstName, te.User.LastName })
                .Select(g => new
                {
                    Id = g.Key.UserId,
                    Name = $"{g.Key.FirstName} {g.Key.LastName}",
                    TotalHours = g.Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)),
                    EntryCount = g.Count(),
                    AvgHoursPerEntry = g.Average(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0))
                })
                .OrderByDescending(a => a.TotalHours)
                .ToList();

            return aggregates;
        }
        else if (groupBy == "project")
        {
            var timeEntries = await _context.TimeEntries
                .Where(te => te.StartTime >= startDate)
                .Include(te => te.Project)
                .Where(te => te.Project != null)
                .ToListAsync();

            var aggregates = timeEntries
                .GroupBy(te => new { te.ProjectId, te.Project.Name })
                .Select(g => new
                {
                    Id = g.Key.ProjectId,
                    Name = g.Key.Name,
                    TotalHours = g.Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)),
                    EntryCount = g.Count(),
                    UniqueUsers = g.Select(te => te.UserId).Distinct().Count()
                })
                .OrderByDescending(a => a.TotalHours)
                .ToList();

            return aggregates;
        }

        return BadRequest("Invalid groupBy parameter");
    }

    /// <summary>
    /// Haal afwijkende registraties op
    /// </summary>
    [HttpGet("time-entries/validations")]
    public async Task<ActionResult<IEnumerable<object>>> GetTimeEntriesValidations()
    {
        var validations = new List<object>();

        // Controleer op >24 uur per dag per gebruiker
        var allTimeEntries = await _context.TimeEntries
            .Include(te => te.User)
            .Where(te => te.User != null)
            .ToListAsync();

        var excessiveHours = allTimeEntries
            .Where(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0) > 24)
            .Select(te => new
            {
                te.Id,
                Rule = "excessive_hours",
                Severity = "error",
                Message = $"{(string.IsNullOrWhiteSpace($"{te.User.FirstName} {te.User.LastName}".Trim()) ? $"Gebruiker {te.User.Id}" : $"{te.User.FirstName} {te.User.LastName}".Trim())} heeft meer dan 24 uur geregistreerd op {te.StartTime.Date:dd-MM-yyyy}",
                UserId = te.UserId,
                Date = te.StartTime.Date,
                Hours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)
            })
            .ToList();

        validations.AddRange(excessiveHours);

        // Controleer op overlapping entries per gebruiker per dag
        var overlappingEntries = allTimeEntries
            .GroupBy(te => new { te.UserId, Date = te.StartTime.Date })
            .Where(g => g.Count() > 1)
            .SelectMany(g => g.OrderBy(te => te.StartTime))
            .ToList();

        for (int i = 0; i < overlappingEntries.Count - 1; i++)
        {
            var current = overlappingEntries[i];
            var next = overlappingEntries[i + 1];

            if (current.EndTime > next.StartTime)
            {
                validations.Add(new
                {
                    Id = $"overlap-{current.Id}-{next.Id}",
                    Rule = "overlapping_entries",
                    Severity = "warning",
                    Message = $"{(string.IsNullOrWhiteSpace($"{current.User.FirstName} {current.User.LastName}".Trim()) ? $"Gebruiker {current.User.Id}" : $"{current.User.FirstName} {current.User.LastName}".Trim())} heeft overlappende registraties op {current.StartTime.Date:dd-MM-yyyy}",
                    UserId = current.UserId,
                    Date = current.StartTime.Date,
                    Details = $"Entry {current.Id} eindigt om {current.EndTime:T}, entry {next.Id} begint om {next.StartTime:T}"
                });
            }
        }

        // Controleer op ontbrekende pauze voor lange entries (>8 uur)
        var missingBreak = allTimeEntries
            .Where(te => (te.EndTime - te.StartTime).TotalHours > 8 && te.BreakMinutes == 0)
            .Select(te => new
            {
                te.Id,
                Rule = "missing_break",
                Severity = "warning",
                Message = $"{(string.IsNullOrWhiteSpace($"{te.User.FirstName} {te.User.LastName}".Trim()) ? $"Gebruiker {te.User.Id}" : $"{te.User.FirstName} {te.User.LastName}".Trim())} heeft geen pauze geregistreerd voor {((te.EndTime - te.StartTime).TotalHours):F1} uur op {te.StartTime.Date:dd-MM-yyyy}",
                UserId = te.UserId,
                Date = te.StartTime.Date,
                Hours = (te.EndTime - te.StartTime).TotalHours
            })
            .ToList();

        validations.AddRange(missingBreak);

        return Ok(validations.OrderBy(v => ((dynamic)v).Severity).ThenBy(v => ((dynamic)v).Date));
    }

    /// <summary>
    /// Haal hiërarchische lijst van projecten en werkcodes
    /// </summary>
    [HttpGet("projects")]
    public async Task<ActionResult<IEnumerable<object>>> GetProjects()
    {
        var projects = await _context.Projects
            .Include(p => p.ProjectGroup)
                .ThenInclude(pg => pg.Company)
            .OrderBy(p => p.ProjectGroup.Company.Name)
                .ThenBy(p => p.ProjectGroup.Name)
                .ThenBy(p => p.Name)
            .ToListAsync();

        var timeEntries = await _context.TimeEntries.ToListAsync();

        var projectHours = timeEntries.GroupBy(te => te.ProjectId)
            .ToDictionary(g => g.Key, g => g.Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)));

        var activeUsers = timeEntries.GroupBy(te => te.ProjectId)
            .ToDictionary(g => g.Key, g => g.Select(te => te.UserId).Distinct().Count());

        var result = projects.Select(p => new
        {
            p.Id,
            p.Name,
            p.Status,
            ProjectGroup = p.ProjectGroup != null ? new
            {
                p.ProjectGroup.Id,
                p.ProjectGroup.Name,
                Company = p.ProjectGroup.Company != null ? new
                {
                    p.ProjectGroup.Company.Id,
                    p.ProjectGroup.Company.Name
                } : null
            } : null,
            TotalHours = projectHours.ContainsKey(p.Id) ? projectHours[p.Id] : 0,
            ActiveUsers = activeUsers.ContainsKey(p.Id) ? activeUsers[p.Id] : 0
        }).ToList();

        return result;
    }

    /// <summary>
    /// Haal detail van een specifiek project
    /// </summary>
    [HttpGet("projects/{id}")]
    public async Task<ActionResult<object>> GetProjectDetail(int id)
    {
        var project = await _context.Projects
            .Include(p => p.ProjectGroup)
                .ThenInclude(pg => pg.Company)
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Status,
                p.CreatedAt,
                ProjectGroup = p.ProjectGroup != null ? new
                {
                    p.ProjectGroup.Id,
                    p.ProjectGroup.Name,
                    Company = p.ProjectGroup.Company != null ? new
                    {
                        p.ProjectGroup.Company.Id,
                        p.ProjectGroup.Company.Name
                    } : null
                } : null
            })
            .FirstOrDefaultAsync();

        if (project == null) return NotFound();

        // Geassocieerde uren en medewerkers
        var now = DateTime.Now;
        var thirtyDaysAgo = now.AddDays(-30);

        var recentHours = _context.TimeEntries
            .Where(te => te.ProjectId == id && te.StartTime >= thirtyDaysAgo)
            .AsEnumerable()
            .Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));

        var activeUsers = await _context.TimeEntries
            .Where(te => te.ProjectId == id && te.StartTime >= thirtyDaysAgo)
            .Include(te => te.User)
            .Where(te => te.User != null)
            .Select(te => new { te.User.Id, FullName = $"{te.User.FirstName} {te.User.LastName}" })
            .Distinct()
            .ToListAsync();

        var lastActivity = await _context.TimeEntries
            .Where(te => te.ProjectId == id)
            .OrderByDescending(te => te.StartTime)
            .Select(te => te.StartTime)
            .FirstOrDefaultAsync();

        return new
        {
            project.Id,
            project.Name,
            project.Status,
            project.CreatedAt,
            project.ProjectGroup,
            RecentHours = Math.Round(recentHours, 2),
            ActiveUsers = activeUsers,
            LastActivity = lastActivity
        };
    }

    /// <summary>
    /// Haal lijst van afdelingen (companies) met counts
    /// </summary>
    [HttpGet("departments")]
    public async Task<ActionResult<IEnumerable<object>>> GetDepartments()
    {
        var departments = await _context.Companies
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                ProjectGroupsCount = c.ProjectGroups.Count,
                ProjectsCount = c.ProjectGroups.Sum(pg => pg.Projects.Count),
                TotalHours = c.ProjectGroups
                    .Sum(pg => pg.Projects
                        .Sum(p => _context.TimeEntries
                            .Where(te => te.ProjectId == p.Id)
                            .Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)))),
                ActiveUsers = c.ProjectGroups
                    .Sum(pg => pg.Projects
                        .Sum(p => _context.TimeEntries
                            .Where(te => te.ProjectId == p.Id)
                            .Select(te => te.UserId)
                            .Distinct()
                            .Count()))
            })
            .ToListAsync();

        return departments;
    }

    /// <summary>
    /// Haal lijst van actieve validatie afwijkingen
    /// </summary>
    [HttpGet("validations")]
    public async Task<ActionResult<IEnumerable<object>>> GetValidations()
    {
        // Voor nu, retourneer dezelfde als time-entries/validations
        // Later kan dit gefilterd worden op actieve alleen
        return await GetTimeEntriesValidations();
    }

    /// <summary>
    /// Trigger een validatie run (voor nu retourneert huidige validaties)
    /// </summary>
    [HttpPost("validations/run")]
    public async Task<ActionResult<object>> RunValidations()
    {
        var validationsResult = await GetTimeEntriesValidations();
        var validations = validationsResult.Value as IEnumerable<object> ?? new List<object>();
        var summary = new
        {
            runTimestamp = DateTime.UtcNow,
            totalValidations = validations.Count(),
            errorCount = validations.Count(v => ((dynamic)v).Severity == "error"),
            warningCount = validations.Count(v => ((dynamic)v).Severity == "warning"),
            validations = validations
        };

        // Log de validatie run
        var log = new Log
        {
            Level = "info",
            Component = "Validation",
            Message = $"Validaties uitgevoerd: {summary.totalValidations} gevonden ({summary.errorCount} errors, {summary.warningCount} warnings)",
            Details = $"Timestamp: {summary.runTimestamp}"
        };
        _context.Logs.Add(log);
        await _context.SaveChangesAsync();

        return summary;
    }

    /// <summary>
    /// Haal historie van validatie runs (placeholder - geen eigen opslag)
    /// </summary>
    [HttpGet("validations/history")]
    public async Task<ActionResult<IEnumerable<object>>> GetValidationsHistory()
    {
        // Placeholder - in productie zou dit uit een log tabel komen
        var history = new object[0];

        return history;
    }

    /// <summary>
    /// Krijg alle time entries met gedetailleerde gegevens
    /// </summary>
    [HttpGet("time-entries")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllTimeEntries()
    {
        var entries = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .Where(te => te.User != null)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return entries.Select(te => new
        {
            te.Id,
            te.StartTime,
            te.EndTime,
            te.BreakMinutes,
            te.DistanceKm,
            te.TravelCosts,
            te.Expenses,
            te.Notes,
            te.Status,
            User = new { te.User.Id, FirstName = te.User.FirstName, LastName = te.User.LastName, FullName = string.IsNullOrWhiteSpace($"{te.User.FirstName} {te.User.LastName}".Trim()) ? $"Gebruiker {te.User.Id}" : $"{te.User.FirstName} {te.User.LastName}".Trim() },
            Project = new
            {
                te.Project.Id,
                te.Project.Name,
                ProjectGroup = te.Project.ProjectGroup != null ? new
                {
                    te.Project.ProjectGroup.Id,
                    te.Project.ProjectGroup.Name,
                    Company = te.Project.ProjectGroup.Company != null ? new
                    {
                        te.Project.ProjectGroup.Company.Id,
                        te.Project.ProjectGroup.Company.Name
                    } : null
                } : null
            }
        }).ToList();
    }

    /// <summary>
    /// Krijg alle vakantie-aanvragen
    /// </summary>
    [HttpGet("vacation-requests")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllVacationRequests()
    {
        var requests = await _context.VacationRequests
            .Include(vr => vr.User)
            .OrderByDescending(vr => vr.StartDate)
            .ToListAsync();

        return requests.Select(vr => new
        {
            vr.Id,
            vr.StartDate,
            vr.EndDate,
            vr.Hours,
            vr.Reason,
            vr.Status,
            User = new { vr.User.Id, FirstName = vr.User.FirstName, LastName = vr.User.LastName, FullName = $"{vr.User.FirstName} {vr.User.LastName}" }
        }).ToList();
    }

    /// <summary>
    /// Verwerk een vakantie-aanvraag (goedkeuren/afkeuren)
    /// </summary>
    // Vervang/update deze methode in AdminController.cs

    // Update de ProcessVacationRequest methode
    [HttpPut("vacation-requests/{id}")]
    public async Task<IActionResult> ProcessVacationRequest(int id, [FromBody] VacationStatusDto dto)
    {
        var request = await _context.VacationRequests
            .Include(vr => vr.User)
            .FirstOrDefaultAsync(vr => vr.Id == id);

        if (request == null) return NotFound();

        request.Status = dto.Status;

        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = request.UserId,
            Type = "vacation",
            Action = dto.Status == "approved" ? "approved" : "rejected",
            Message = $"Vakantie-aanvraag van {request.StartDate.ToString("dd-MM-yyyy")} tot {request.EndDate.ToString("dd-MM-yyyy")} is {(dto.Status == "approved" ? "goedgekeurd" : "afgekeurd")}",
            Details = $"Uren: {request.Hours}, Reden: {request.Reason ?? "Geen reden opgegeven"}"
        };

        _context.Activities.Add(activity);

        _context.Entry(request).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok($"Vakantie-aanvraag {dto.Status}");
    }

    /// <summary>
    /// Maak een nieuw project aan
    /// </summary>
    [HttpPost("projects")]
    public async Task<IActionResult> CreateProject([FromBody] ProjectDto projectDto)
    {
        var project = new Project
        {
            Name = projectDto.Name,
            ProjectGroupId = projectDto.ProjectGroupId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        return Ok(project);
    }

    [HttpDelete("projects/{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound("Project niet gevonden");
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();

        return Ok("Project succesvol verwijderd");
    }

    /// <summary>
    /// Haal lijst van interne logs
    /// </summary>
    [HttpGet("logs")]
    public async Task<ActionResult<IEnumerable<object>>> GetLogs(
        [FromQuery] string? level = null,
        [FromQuery] string? component = null,
        [FromQuery] int limit = 50)
    {
        var query = _context.Logs.AsQueryable();

        if (!string.IsNullOrEmpty(level))
        {
            query = query.Where(l => l.Level == level);
        }

        if (!string.IsNullOrEmpty(component))
        {
            query = query.Where(l => l.Component == component);
        }

        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Take(limit)
            .Select(l => new
            {
                l.Id,
                timestamp = l.Timestamp,
                level = l.Level,
                component = l.Component,
                message = l.Message,
                details = l.Details,
                userId = l.UserId,
                userName = l.User != null ? $"{l.User.FirstName} {l.User.LastName}" : null
            })
            .ToListAsync();

        return Ok(logs);
    }

    /// <summary>
    /// Haal detail van een specifieke log entry
    /// </summary>
    [HttpGet("logs/{id}")]
    public async Task<ActionResult<object>> GetLogDetail(int id)
    {
        var log = await _context.Logs
            .Include(l => l.User)
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                timestamp = l.Timestamp,
                level = l.Level,
                component = l.Component,
                message = l.Message,
                details = l.Details,
                userId = l.UserId,
                userName = l.User != null ? $"{l.User.FirstName} {l.User.LastName}" : null
            })
            .FirstOrDefaultAsync();

        return log ?? NotFound();
    }

    /// <summary>
    /// Verwijder oude logs
    /// </summary>
    [HttpDelete("logs")]
    public async Task<IActionResult> CleanupLogs([FromQuery] int olderThanDays = 30)
    {
        var cutoff = DateTime.UtcNow.AddDays(-olderThanDays);
        var oldLogs = await _context.Logs
            .Where(l => l.Timestamp < cutoff)
            .ToListAsync();

        _context.Logs.RemoveRange(oldLogs);
        await _context.SaveChangesAsync();

        return Ok($"{oldLogs.Count} logs ouder dan {olderThanDays} dagen verwijderd");
    }

    /// <summary>
    /// Haal systeem health op
    /// </summary>
    [HttpGet("system/health")]
    public async Task<ActionResult<object>> GetSystemHealth()
    {
        // Voor nu, retourneer dezelfde als dashboard/health
        return await GetDashboardHealth();
    }

    /// <summary>
    /// Haal systeem configuratie op
    /// </summary>
    [HttpGet("system/config")]
    public async Task<ActionResult<object>> GetSystemConfig()
    {
        // Placeholder voor configuratie - in productie uit appsettings of database
        var config = new
        {
            maintenanceMode = false,
            featureFlags = new
            {
                enableValidations = true,
                enableExports = true,
                enableNotifications = false
            },
            cacheTtlMinutes = 5,
            maxQueryTimeoutSeconds = 30
        };

        return config;
    }

    /// <summary>
    /// Update systeem configuratie
    /// </summary>
    [HttpPut("system/config")]
    public async Task<IActionResult> UpdateSystemConfig([FromBody] dynamic config)
    {
        // Placeholder - in productie zou dit persistent opgeslagen worden
        // Voor nu, accepteer maar doe niets
        return Ok("Configuratie bijgewerkt (placeholder)");
    }
}

public class VacationStatusDto
{
    public string? Status { get; set; } // "approved" of "rejected"
}

public class ProjectDto
{
    public string? Name { get; set; }
    public int ProjectGroupId { get; set; }
}
