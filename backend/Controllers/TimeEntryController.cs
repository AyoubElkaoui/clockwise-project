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

    // GET: api/time-entries - Get all time entries (admin/manager only)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTimeEntries()
    {
        // Include all related data including processing information
        var entries = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.ProcessedByUser) // NEW: Include processor information
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return entries;
    }

    // GET: api/time-entries/user/{userId} - Get time entries for specific user
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTimeEntriesByUser(int userId)
    {
        var entries = await _context.TimeEntries
            .Where(te => te.UserId == userId)
            .Include(te => te.User)
            .Include(te => te.ProcessedByUser) // NEW: Include processor information
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return entries;
    }

    // GET: api/time-entries/pending-approval - Get entries pending approval for managers
    [HttpGet("pending-approval")]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetPendingApprovals()
    {
        // TODO: Get current user from authentication
        // For now, get all submitted entries
        var entries = await _context.TimeEntries
            .Where(te => te.Status == "ingeleverd")
            .Include(te => te.User)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return entries;
    }

    // GET: api/time-entries/pending-approval/manager/{managerId} - Get entries for specific manager's team
    [HttpGet("pending-approval/manager/{managerId}")]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetPendingApprovalsForManager(int managerId)
    {
        var entries = await _context.TimeEntries
            .Where(te => te.Status == "ingeleverd" && te.User.ManagerId == managerId)
            .Include(te => te.User)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .OrderByDescending(te => te.StartTime)
            .ToListAsync();

        return entries;
    }

    // POST: api/time-entries
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

        // Normalize status - ensure it's always a valid backend status
        entry.Status = NormalizeStatus(entry.Status);

        // Set RequestDate if not provided
        if (entry.RequestDate == default)
        {
            entry.RequestDate = DateTime.Now;
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

        var existingEntry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
            
        if (existingEntry == null)
        {
            return NotFound();
        }

        // Security check: Users can only edit their own entries (unless admin/manager)
        var currentUser = await GetCurrentUserFromRequest();
        if (currentUser != null && existingEntry.UserId != currentUser.Id)
        {
            if (currentUser.Rank != "admin" && currentUser.Rank != "manager") // 
            {
                return Forbid("Je kunt alleen je eigen uren bewerken");
            }
        }

        // Allow updates for all statuses except "goedgekeurd" (approved)
        if (existingEntry.Status == "goedgekeurd")
        {
            return BadRequest("Goedgekeurde uren kunnen niet meer worden bewerkt");
        }

        // Validate status transition
        var normalizedStatus = NormalizeStatus(updatedEntry.Status);
        if (!IsValidStatusTransition(existingEntry.Status, normalizedStatus))
        {
            return BadRequest($"Ongeldige status overgang van {existingEntry.Status} naar {normalizedStatus}");
        }

        // Update all fields except ID and processing fields (those are set by approval actions)
        existingEntry.UserId = updatedEntry.UserId;
        existingEntry.ProjectId = updatedEntry.ProjectId;
        existingEntry.StartTime = updatedEntry.StartTime;
        existingEntry.EndTime = updatedEntry.EndTime;
        existingEntry.BreakMinutes = updatedEntry.BreakMinutes;
        existingEntry.DistanceKm = updatedEntry.DistanceKm;
        existingEntry.TravelCosts = updatedEntry.TravelCosts;
        existingEntry.Expenses = updatedEntry.Expenses;
        existingEntry.Notes = updatedEntry.Notes;
        existingEntry.Status = normalizedStatus;

        _context.Entry(existingEntry).State = EntityState.Modified;
        
        // Add activity log for status changes
        if (existingEntry.Status != normalizedStatus)
        {
            await LogStatusChangeActivity(existingEntry, normalizedStatus);
        }
        
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
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .FirstOrDefaultAsync(te => te.Id == id);
            
        if (entry == null)
        {
            return NotFound();
        }

        // Security check: Users can only delete their own entries (unless admin/manager)
        var currentUser = await GetCurrentUserFromRequest();
        if (currentUser != null && entry.UserId != currentUser.Id)
        {
            if (currentUser.Rank != "admin" && currentUser.Rank != "manager") // 
            {
                return Forbid("Je kunt alleen je eigen uren verwijderen");
            }
        }

        // Only allow deletion of draft entries and submitted entries (not approved ones)
        if (entry.Status == "goedgekeurd")
        {
            return BadRequest("Goedgekeurde uren kunnen niet worden verwijderd");
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

        // Security check: Users can only submit their own entries (unless admin/manager)
        var currentUser = await GetCurrentUserFromRequest();
        if (currentUser != null && entry.UserId != currentUser.Id)
        {
            if (currentUser.Rank != "admin" && currentUser.Rank != "manager") 
            {
                return Forbid("Je kunt alleen je eigen uren indienen");
            }
        }

        // Only allow submission of draft entries
        if (entry.Status != "opgeslagen")
        {
            return BadRequest("Alleen opgeslagen uren kunnen worden ingeleverd");
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

    // POST: api/time-entries/{id}/revert
    [HttpPost("{id}/revert")]
    public async Task<IActionResult> RevertTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
        {
            return NotFound();
        }

        // Security check: Users can only revert their own entries (unless admin/manager)
        var currentUser = await GetCurrentUserFromRequest();
        if (currentUser != null && entry.UserId != currentUser.Id)
        {
            if (currentUser.Rank != "admin" && currentUser.Rank != "manager") 
            {
                return Forbid("Je kunt alleen je eigen uren terugdraaien");
            }
        }

        // Only allow reverting submitted entries back to draft
        if (entry.Status != "ingeleverd")
        {
            return BadRequest("Alleen ingeleverde uren kunnen worden teruggetrokken");
        }

        entry.Status = "opgeslagen";
        _context.Entry(entry).State = EntityState.Modified;
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "reverted",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn teruggetrokken naar concept",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok("Uren teruggetrokken naar concept");
    }
    
    // UPDATED: New approval method with processing tracking
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveTimeEntry(int id, [FromBody] ProcessTimeEntryDto? processingInfo = null)
    {
        try
        {
            var entry = await _context.TimeEntries
                .Include(te => te.User)
                .Include(te => te.Project)
                .FirstOrDefaultAsync(te => te.Id == id);
        
            if (entry == null)
            {
                return NotFound("Time entry niet gevonden");
            }

            // Get current user for processing tracking
            var currentUser = await GetCurrentUserFromRequest();
            
            // Authorization check - only managers and admins can approve
            if (currentUser != null && currentUser.Rank != "admin" && currentUser.Rank != "manager") 
            {
                return Forbid("Alleen managers en admins kunnen uren goedkeuren");
            }

            // Managers can only approve entries from their team members
            if (currentUser?.Rank == "manager" && entry.User?.ManagerId != currentUser.Id)
            {
                return Forbid("Managers kunnen alleen uren goedkeuren van hun teamleden");
            }

            // Only allow approval of submitted entries
            if (entry.Status != "ingeleverd")
            {
                return BadRequest($"Alleen ingeleverde uren kunnen worden goedgekeurd. Huidige status: {entry.Status}");
            }

            // Update status and processing information
            entry.Status = "goedgekeurd";
            entry.ProcessedBy = currentUser?.Id; // NEW: Track who processed
            entry.ProcessedDate = DateTime.Now; // NEW: Track when processed
            entry.ProcessingNotes = processingInfo?.Notes; // NEW: Optional processing notes
            
            _context.Entry(entry).State = EntityState.Modified;

            // Add activity log
            try
            {
                var processorName = currentUser != null ? $"{currentUser.FirstName} {currentUser.LastName}" : "Manager";
                var activity = new Activity
                {
                    UserId = entry.UserId,
                    Type = "time_entry",
                    Action = "approved",
                    Message = $"Uren voor {entry.StartTime:dd-MM-yyyy} zijn goedgekeurd door {processorName}",
                    Details = $"Project: {entry.Project?.Name ?? "Onbekend"}" + 
                             (!string.IsNullOrEmpty(entry.ProcessingNotes) ? $", Notitie: {entry.ProcessingNotes}" : ""),
                };

                _context.Activities.Add(activity);
            }
            catch (Exception activityEx)
            {
                Console.WriteLine($"Activity logging failed: {activityEx.Message}");
            }

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Uren goedgekeurd", 
                status = "goedgekeurd",
                processedBy = currentUser?.Id,
                processedDate = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in ApproveTimeEntry: {ex.Message}");
            return StatusCode(500, $"Server error: {ex.Message}");
        }
    }

    // UPDATED: New rejection method with processing tracking
    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectTimeEntry(int id, [FromBody] ProcessTimeEntryDto processingInfo)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
            return NotFound();

        var currentUser = await GetCurrentUserFromRequest();
        
        // Only managers and admins can reject entries
        if (currentUser?.Rank != "admin" && currentUser?.Rank != "manager") 
        {
            return Forbid("Alleen managers en admins kunnen uren afkeuren");
        }

        // Managers can only reject entries from their team members
        if (currentUser?.Rank == "manager" && entry.User?.ManagerId != currentUser.Id)
        {
            return Forbid("Managers kunnen alleen uren afkeuren van hun teamleden");
        }

        // Only allow rejection of submitted entries
        if (entry.Status != "ingeleverd")
        {
            return BadRequest("Alleen ingeleverde uren kunnen worden afgekeurd");
        }

        // When rejected, revert back to draft so user can edit and resubmit
        entry.Status = "opgeslagen";
        entry.ProcessedBy = currentUser?.Id; // NEW: Track who processed
        entry.ProcessedDate = DateTime.Now; // NEW: Track when processed  
        entry.ProcessingNotes = processingInfo?.Notes ?? "Afgekeurd"; // NEW: Processing notes
    
        var processorName = currentUser != null ? $"{currentUser.FirstName} {currentUser.LastName}" : "Manager";
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "rejected",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn afgekeurd door {processorName} en teruggezet naar concept",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}" + 
                     (!string.IsNullOrEmpty(entry.ProcessingNotes) ? $", Reden: {entry.ProcessingNotes}" : "")
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok(new {
            message = "Uren afgekeurd en teruggezet naar concept",
            status = "opgeslagen",
            processedBy = currentUser?.Id,
            processedDate = DateTime.Now,
            rejectionReason = entry.ProcessingNotes
        });
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult<TimeEntry>> GetTimeEntryDetails(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.ProcessedByUser) // NEW: Include processor information
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .FirstOrDefaultAsync(te => te.Id == id);
    
        if (entry == null)
            return NotFound();

        // Security check: Users can only view their own entries (unless admin/manager)
        var currentUser = await GetCurrentUserFromRequest();
        if (currentUser != null && entry.UserId != currentUser.Id)
        {
            if (currentUser.Rank != "admin" && currentUser.Rank != "manager") 
            {
                return Forbid("Je kunt alleen je eigen uren bekijken");
            }
        }
    
        return entry;
    }

    // HELPER METHODS

    /// <summary>
    /// Normalize status values to ensure consistency
    /// </summary>
    private string NormalizeStatus(string status)
    {
        if (string.IsNullOrEmpty(status))
            return "opgeslagen";

        return status.ToLower() switch
        {
            "concept" => "opgeslagen",
            "ingediend" => "ingeleverd", 
            "goedgekeurd" => "goedgekeurd",
            "afgekeurd" => "opgeslagen", // Rejected entries go back to draft
            "opgeslagen" => "opgeslagen",
            "ingeleverd" => "ingeleverd",
            _ => "opgeslagen" // Default to draft for unknown statuses
        };
    }

    /// <summary>
    /// Validate status transitions
    /// </summary>
    private bool IsValidStatusTransition(string fromStatus, string toStatus)
    {
        if (toStatus == "opgeslagen")
            return true;

        return fromStatus switch
        {
            "opgeslagen" => toStatus == "ingeleverd" || toStatus == "opgeslagen",
            "ingeleverd" => toStatus == "goedgekeurd" || toStatus == "opgeslagen",
            "goedgekeurd" => false, // Approved entries cannot be changed
            _ => toStatus == "opgeslagen"
        };
    }

    /// <summary>
    /// Get current user from request - implement based on your auth system
    /// </summary>
    private async Task<User?> GetCurrentUserFromRequest()
    {
        // TODO: Implement based on your authentication system
        return null;
    }

    /// <summary>
    /// Log status change activities
    /// </summary>
    private async Task LogStatusChangeActivity(TimeEntry entry, string newStatus)
    {
        string action = newStatus switch
        {
            "opgeslagen" => "saved_as_draft",
            "ingeleverd" => "submitted",
            "goedgekeurd" => "approved",
            _ => "status_changed"
        };

        string message = newStatus switch
        {
            "opgeslagen" => $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} opgeslagen als concept",
            "ingeleverd" => $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} ingeleverd",
            "goedgekeurd" => $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} goedgekeurd",
            _ => $"Status van uren voor {entry.StartTime.ToString("dd-MM-yyyy")} gewijzigd naar {newStatus}"
        };

        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = action,
            Message = message,
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };

        _context.Activities.Add(activity);
    }
}

// NEW: DTO for processing time entries
public class ProcessTimeEntryDto
{
    public string? Notes { get; set; }
}