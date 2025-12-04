using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/time-entries")]
[ApiController]
public class TimeEntryController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public TimeEntryController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/time-entries (ADMIN - alle entries)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTimeEntries()
    {
        // Include Project -> ThenInclude ProjectGroup -> ThenInclude Company
        var entries = await _context.TimeEntries
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .ToListAsync();

        return entries;
    }

    // GET: api/time-entries/team?managerId=5 (MANAGER - alleen team entries)
    [HttpGet("team")]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTeamTimeEntries([FromQuery] int managerId)
    {
        // Haal eerst alle team member IDs op
        var teamMemberIds = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Rank == "user")
            .Select(u => u.Id)
            .ToListAsync();

        // Haal entries van alle team members
        var entries = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .Where(te => teamMemberIds.Contains(te.UserId))
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return Ok(entries);
    }

    // GET: api/time-entries/team/pending?managerId=5 (MANAGER - pending approvals)
    [HttpGet("team/pending")]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTeamPendingEntries([FromQuery] int managerId)
    {
        var teamMemberIds = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Rank == "user")
            .Select(u => u.Id)
            .ToListAsync();

        var pendingEntries = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .Where(te => teamMemberIds.Contains(te.UserId) && te.Status == "ingeleverd")
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return Ok(pendingEntries);
    }

    // GET: api/time-entries/user/{userId}/week?startDate=2025-10-27
    [HttpGet("user/{userId}/week")]
    public async Task<ActionResult<IEnumerable<object>>> GetUserWeekEntries(int userId, [FromQuery] string startDate)
    {
        DateTime weekStart;
        if (!DateTime.TryParse(startDate, out weekStart))
        {
            return BadRequest("Invalid date format");
        }

        var weekEnd = weekStart.AddDays(7);

        var entries = await _context.TimeEntries
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .Where(te => te.UserId == userId && te.StartTime >= weekStart && te.StartTime < weekEnd)
            .ToListAsync();

        var result = entries.Select(te => new
        {
            te.Id,
            Date = te.StartTime.ToString("yyyy-MM-dd"),
            CompanyId = te.Project?.ProjectGroup?.Company?.Id ?? 0,
            CompanyName = te.Project?.ProjectGroup?.Company?.Name ?? "",
            ProjectGroupId = te.Project?.ProjectGroup?.Id ?? 0,
            ProjectGroupName = te.Project?.ProjectGroup?.Name ?? "",
            ProjectId = te.Project?.Id ?? 0,
            ProjectName = te.Project?.Name ?? "",
            Hours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0),
            Km = te.DistanceKm,
            Expenses = te.Expenses,
            BreakMinutes = te.BreakMinutes,
            Notes = te.Notes,
            te.Status
        });

        return Ok(result);
    }

    // POST: api/time-entries/bulk - Sla meerdere entries tegelijk op (UPSERT)
    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulkTimeEntries([FromBody] List<TimeEntryDto> entries)
    {
        if (entries == null || !entries.Any())
        {
            return BadRequest("Geen entries ontvangen");
        }

        int updated = 0;
        int created = 0;

        foreach (var dto in entries)
        {
            var entryDate = DateTime.Parse(dto.Date).Date;
            
            // Check if entry already exists for this user/project/date
            var existingEntry = await _context.TimeEntries
                .FirstOrDefaultAsync(te => 
                    te.UserId == dto.UserId && 
                    te.ProjectId == dto.ProjectId && 
                    te.StartTime.Date == entryDate);

            if (existingEntry != null)
            {
                // UPDATE existing entry
                existingEntry.EndTime = entryDate.AddHours(dto.Hours);
                existingEntry.BreakMinutes = dto.BreakMinutes;
                existingEntry.DistanceKm = dto.Km;
                existingEntry.Expenses = dto.Expenses;
                existingEntry.Notes = dto.Notes;
                existingEntry.Status = dto.Status ?? "opgeslagen";
                updated++;
            }
            else
            {
                // INSERT new entry
                var newEntry = new TimeEntry
                {
                    UserId = dto.UserId,
                    ProjectId = dto.ProjectId,
                    StartTime = entryDate,
                    EndTime = entryDate.AddHours(dto.Hours),
                    BreakMinutes = dto.BreakMinutes,
                    DistanceKm = dto.Km,
                    Expenses = dto.Expenses,
                    Notes = dto.Notes,
                    Status = dto.Status ?? "opgeslagen"
                };
                _context.TimeEntries.Add(newEntry);
                created++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { 
            message = $"Uren opgeslagen: {created} nieuw, {updated} gewijzigd", 
            created, 
            updated 
        });
    }

    // POST: api/time-entries
    // Aanpassing in TimeEntryController.cs - CreateTimeEntry methode
    [HttpPost]
    public async Task<IActionResult> CreateTimeEntry([FromBody] TimeEntry entry)
    {
        if (entry == null)
        {
            return BadRequest("Ongeldige invoer");
        }

        // Controleer of gebruiker is toegewezen aan dit project
        bool isAssigned = await _context.UserProjects
            .AnyAsync(up => up.UserId == entry.UserId && up.ProjectId == entry.ProjectId);

        if (!isAssigned)
        {
            // Controleer of de gebruiker een admin of manager is
            var user = await _context.Users.FindAsync(entry.UserId);
            bool isAdminOrManager = user != null && (user.Rank == "admin" || user.Rank == "manager");
        
            // Als geen admin/manager, weiger toegang
            if (!isAdminOrManager)
            {
                return BadRequest("U bent niet toegewezen aan dit project");
            }
        }

        if (string.IsNullOrEmpty(entry.Status))
        {
            entry.Status = "opgeslagen";
        }

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();
        return Ok("Uren opgeslagen!");
    }

    // PUT: api/time-entries/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTimeEntry(int id, [FromBody] TimeEntry updatedEntry)
    {
        if (id != updatedEntry.Id)
        {
            return BadRequest("ID mismatch");
        }

        _context.Entry(updatedEntry).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.TimeEntries.Any(e => e.Id == id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return Ok("Uren bijgewerkt");
    }

    // DELETE: api/time-entries/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimeEntry(int id)
    {
        var entry = await _context.TimeEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        _context.TimeEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return Ok("Uren verwijderd");
    }

    // POST: api/time-entries/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
        {
            return NotFound();
        }

        entry.Status = "ingeleverd";
        _context.Entry(entry).State = EntityState.Modified;
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "submitted",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn ingeleverd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok("Uren ingeleverd");
    }
    
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
            return NotFound();

        entry.Status = "goedgekeurd";
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "approved",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn goedgekeurd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok();
    }


    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
            return NotFound();

        entry.Status = "afgekeurd";
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "rejected",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn afgekeurd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok();
    }
    

    [HttpGet("{id}/details")]
    public async Task<ActionResult<TimeEntry>> GetTimeEntryDetails(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .ThenInclude(p => p.ProjectGroup)
            .ThenInclude(pg => pg.Company)
            .FirstOrDefaultAsync(te => te.Id == id);
    
        if (entry == null)
            return NotFound();
    
        return entry;
    }
    
    
    
    
}
