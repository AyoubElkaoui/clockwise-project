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
        var totalProjects = await _context.Projects.CountAsync();
    
        // Haal alle time entries op en bereken uren in code (niet in de database)
        var timeEntries = await _context.TimeEntries.ToListAsync();
        var totalHours = timeEntries.Sum(te => 
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));
    
        // Bereken uren deze maand
        var thisMonth = DateTime.Now.Month;
        var thisYear = DateTime.Now.Year;
        var entriesThisMonth = timeEntries.Where(te => 
            te.StartTime.Month == thisMonth && te.StartTime.Year == thisYear);
        var hoursThisMonth = entriesThisMonth.Sum(te => 
            (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0));
        
        // Aantal actieve projecten (met uren in laatste 30 dagen)
        var thirtyDaysAgo = DateTime.Now.AddDays(-30);
        var activeProjects = timeEntries
            .Where(te => te.StartTime >= thirtyDaysAgo)
            .Select(te => te.ProjectId)
            .Distinct()
            .Count();
        
        // Vakantie-aanvragen in behandeling
        var pendingVacations = await _context.VacationRequests
            .CountAsync(vr => vr.Status == "pending");
        
        return new
        {
            totalUsers,
            totalProjects,
            totalHours,
            hoursThisMonth,
            activeProjects,
            pendingVacations
        };
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
            User = new { te.User.Id, FullName = $"{te.User.FirstName} {te.User.LastName}" },
            Project = new { 
                te.Project.Id, 
                te.Project.Name,
                ProjectGroup = te.Project.ProjectGroup != null ? new {
                    te.Project.ProjectGroup.Id,
                    te.Project.ProjectGroup.Name,
                    Company = te.Project.ProjectGroup.Company != null ? new {
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
            User = new { vr.User.Id, FullName = $"{vr.User.FirstName} {vr.User.LastName}" }
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
}

public class VacationStatusDto
{
    public string Status { get; set; } // "approved" of "rejected"
}

public class ProjectDto
{
    public string Name { get; set; }
    public int ProjectGroupId { get; set; }
}