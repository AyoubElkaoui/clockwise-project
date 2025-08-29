using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Text.Json;

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
    /// Haal statistieken op voor het admin dashboard - UPDATED with Rank stats
    /// </summary>
    [HttpGet("stats")] 
    public async Task<ActionResult<object>> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalProjects = await _context.Projects.CountAsync();
    
        // Haal alle time entries op en bereken uren in code
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
        
        // NEW: User type statistics
        var userStats = await _context.Users
            .GroupBy(u => u.Rank)
            .Select(g => new { Rank = g.Key, Count = g.Count() })
            .ToListAsync();
        
        // Time entry status statistics
        var entryStats = timeEntries
            .GroupBy(te => te.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();
        
        return new
        {
            totalUsers,
            totalProjects,
            totalHours,
            hoursThisMonth,
            activeProjects,
            pendingVacations,
            // NEW: Detailed statistics
            usersByType = userStats.ToDictionary(x => x.Rank, x => x.Count),
            entriesByStatus = entryStats.ToDictionary(x => x.Status, x => x.Count),
            totalApprovedHours = timeEntries.Where(te => te.Status == "goedgekeurd").Sum(te => (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0)),
            totalPendingEntries = timeEntries.Count(te => te.Status == "ingeleverd"),
            totalProcessedEntries = timeEntries.Count(te => te.ProcessedBy.HasValue) // NEW
        };
    }
    
    /// <summary>
    /// Krijg alle time entries met gedetailleerde gegevens - UPDATED with full processing tracking
    /// </summary>
    [HttpGet("time-entries")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllTimeEntries()
    {
        try
        {
            var entries = await _context.TimeEntries
                .Include(te => te.User)
                    .ThenInclude(u => u.Manager) // NEW: Include user's manager
                .Include(te => te.ProcessedByUser) // NEW: Include processor info
                .Include(te => te.Project)
                    .ThenInclude(p => p.ProjectGroup)
                        .ThenInclude(pg => pg.Company)
                .OrderByDescending(te => te.StartTime)
                .ToListAsync();
                
            var result = entries.Select(te => new
            {
                // Main TimeEntry properties (matching frontend exactly)
                id = te.Id,
                userId = te.UserId,
                projectId = te.ProjectId,
                startTime = te.StartTime,
                endTime = te.EndTime,
                breakMinutes = te.BreakMinutes,
                distanceKm = te.DistanceKm,
                travelCosts = te.TravelCosts,
                expenses = te.Expenses,
                notes = te.Notes,
                status = te.Status,
                
                // NEW: Processing tracking fields
                processedBy = te.ProcessedBy,
                processedDate = te.ProcessedDate,
                processingNotes = te.ProcessingNotes,
                requestDate = te.RequestDate,
                
                // User object with manager and type info
                user = te.User != null ? new {
                    id = te.User.Id,
                    firstName = te.User.FirstName,
                    lastName = te.User.LastName,
                    fullName = $"{te.User.FirstName} {te.User.LastName}".Trim(),
                    Rank = te.User.Rank, // NEW: User type
                    managerId = te.User.ManagerId, // NEW: Manager ID
                    manager = te.User.Manager != null ? new
                    {
                        id = te.User.Manager.Id,
                        firstName = te.User.Manager.FirstName,
                        lastName = te.User.Manager.LastName,
                        fullName = $"{te.User.Manager.FirstName} {te.User.Manager.LastName}"
                    } : null
                } : null,
                
                // NEW: ProcessedBy user info with full details
                processedByUser = te.ProcessedByUser != null ? new
                {
                    id = te.ProcessedByUser.Id,
                    firstName = te.ProcessedByUser.FirstName,
                    lastName = te.ProcessedByUser.LastName,
                    fullName = $"{te.ProcessedByUser.FirstName} {te.ProcessedByUser.LastName}",
                    Rank = te.ProcessedByUser.Rank // NEW: Processor's role
                } : null,
                
                // Project object with nested structure
                project = te.Project != null ? new {
                    id = te.Project.Id,
                    name = te.Project.Name,
                    projectGroupId = te.Project.ProjectGroupId,
                    projectGroup = te.Project.ProjectGroup != null ? new {
                        id = te.Project.ProjectGroup.Id,
                        name = te.Project.ProjectGroup.Name,
                        companyId = te.Project.ProjectGroup.CompanyId,
                        company = te.Project.ProjectGroup.Company != null ? new {
                            id = te.Project.ProjectGroup.Company.Id,
                            name = te.Project.ProjectGroup.Company.Name
                        } : null
                    } : null
                } : null,
                
                // Helper properties
                totalHours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0),
                isApproved = te.Status == "goedgekeurd",
                isPending = te.Status == "ingeleverd",
                isDraft = te.Status == "opgeslagen",
                hasBeenProcessed = te.ProcessedBy.HasValue, // NEW
                processingDuration = te.ProcessedDate.HasValue && te.RequestDate != default
                    ? (te.ProcessedDate.Value - te.RequestDate).TotalHours : (double?)null // NEW
            }).ToList();

            Console.WriteLine($"Returning {result.Count} time entries for admin");
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAllTimeEntries: {ex.Message}");
            return StatusCode(500, $"Error fetching time entries: {ex.Message}");
        }
    }
    
    /// <summary>
    /// NEW: Get processing statistics for time entries
    /// </summary>
    [HttpGet("time-entries/processing-stats")]
    public async Task<ActionResult<object>> GetTimeEntryProcessingStats()
    {
        try
        {
            var entries = await _context.TimeEntries
                .Include(te => te.ProcessedByUser)
                .Where(te => te.ProcessedBy.HasValue)
                .ToListAsync();

            var stats = new
            {
                totalProcessedEntries = entries.Count,
                processingByRank = entries
                    .Where(te => te.ProcessedByUser != null)
                    .GroupBy(te => te.ProcessedByUser.Rank)
                    .Select(g => new { Rank = g.Key, Count = g.Count() })
                    .ToList(),
                processingByStatus = entries
                    .GroupBy(te => te.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() })
                    .ToList(),
                topProcessors = entries
                    .Where(te => te.ProcessedByUser != null)
                    .GroupBy(te => new { te.ProcessedBy, te.ProcessedByUser.FirstName, te.ProcessedByUser.LastName, te.ProcessedByUser.Rank })
                    .Select(g => new
                    {
                        processorId = g.Key.ProcessedBy,
                        processorName = $"{g.Key.FirstName} {g.Key.LastName}",
                        processorType = g.Key.Rank,
                        processedCount = g.Count(),
                        approvedCount = g.Count(te => te.Status == "goedgekeurd")
                    })
                    .OrderByDescending(x => x.processedCount)
                    .Take(10)
                    .ToList(),
                averageProcessingTime = entries
                    .Where(te => te.ProcessedDate.HasValue && te.RequestDate != default)
                    .Select(te => (te.ProcessedDate!.Value - te.RequestDate).TotalHours)
                    .DefaultIfEmpty(0)
                    .Average()
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting processing stats: {ex.Message}");
            return StatusCode(500, $"Error fetching processing statistics: {ex.Message}");
        }
    }
    /// <summary>
/// Admin approves a time entry - can approve any entry regardless of status
/// </summary>
[HttpPut("time-entries/{id}/approve")]
public async Task<IActionResult> ApproveTimeEntryAsAdmin(int id, [FromBody] JsonElement requestBody)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"Admin approving time entry {id}");

        var timeEntry = await _context.TimeEntries
            .Include(te => te.User)
                .ThenInclude(u => u.Manager)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .FirstOrDefaultAsync(te => te.Id == id);

        if (timeEntry == null)
        {
            Console.WriteLine($"Time entry {id} not found");
            return NotFound("Urenregistratie niet gevonden");
        }

        // Extract parameters from request body
        int? adminId = null;
        string notes = null;

        if (requestBody.TryGetProperty("adminId", out var adminIdProp))
        {
            if (adminIdProp.TryGetInt32(out var adminIdValue))
            {
                adminId = adminIdValue;
            }
        }

        if (requestBody.TryGetProperty("notes", out var notesProp))
        {
            notes = notesProp.GetString();
        }

        Console.WriteLine($"Extracted - AdminId: {adminId}, Notes: {notes ?? "None"}");

        // Validate required fields
        if (!adminId.HasValue)
        {
            Console.WriteLine("AdminId is missing");
            return BadRequest("AdminId is verplicht");
        }

        // Verify the admin user exists and has admin rights
        var adminUser = await _context.Users.FindAsync(adminId.Value);
        if (adminUser == null)
        {
            Console.WriteLine($"Admin user {adminId} not found");
            return BadRequest("Admin gebruiker niet gevonden");
        }

        if (adminUser.Rank != "admin")
        {
            Console.WriteLine($"User {adminId} is not admin: {adminUser.Rank}");
            return BadRequest("Alleen admins kunnen urenregistraties goedkeuren via deze functie");
        }

        // Check if already approved to avoid duplicate processing
        if (timeEntry.Status == "goedgekeurd")
        {
            Console.WriteLine($"Time entry {id} is already approved");
            return BadRequest("Urenregistratie is al goedgekeurd");
        }

        // Store old status for activity logging
        var oldStatus = timeEntry.Status;

        // Update time entry with approval
        timeEntry.Status = "goedgekeurd";
        timeEntry.ProcessedBy = adminId.Value;
        timeEntry.ProcessedDate = DateTime.Now;
        timeEntry.ProcessingNotes = notes; // Can be null/empty for approvals

        // Calculate hours for activity details
        var totalHours = (timeEntry.EndTime - timeEntry.StartTime).TotalHours - (timeEntry.BreakMinutes / 60.0);

        // Create activities for relevant parties
        var actionText = "goedgekeurd door admin";

        // Activity for the time entry owner
        var activityForOwner = new Activity
        {
            UserId = timeEntry.UserId,
            Type = "timeentry",
            Action = "admin_approved",
            Message = $"Urenregistratie van {timeEntry.StartTime:dd-MM-yyyy} is {actionText}",
            Details = $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                     $"Bedrijf: {timeEntry.Project?.ProjectGroup?.Company?.Name ?? "Onbekend"}, " +
                     $"Uren: {totalHours:F2}, " +
                     (!string.IsNullOrEmpty(notes) ? $"Admin opmerkingen: {notes}, " : "") +
                     $"Vorige status: {oldStatus}"
        };

        // Activity for the admin who approved
        var activityForAdmin = new Activity
        {
            UserId = adminId.Value,
            Type = "timeentry_admin",
            Action = "approved_entry",
            Message = $"Urenregistratie van {timeEntry.User?.FirstName} {timeEntry.User?.LastName} goedgekeurd",
            Details = $"Datum: {timeEntry.StartTime:dd-MM-yyyy}, " +
                     $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                     $"Uren: {totalHours:F2}, " +
                     (!string.IsNullOrEmpty(notes) ? $"Opmerkingen: {notes}, " : "") +
                     $"Vorige status: {oldStatus}"
        };

        // Activity for the user's manager (if exists and different from admin)
        Activity activityForManager = null;
        if (timeEntry.User?.ManagerId.HasValue == true && timeEntry.User.ManagerId != adminId)
        {
            activityForManager = new Activity
            {
                UserId = timeEntry.User.ManagerId.Value,
                Type = "timeentry_manager",
                Action = "team_entry_admin_approved",
                Message = $"Urenregistratie van teamlid {timeEntry.User.FirstName} {timeEntry.User.LastName} is goedgekeurd door admin",
                Details = $"Datum: {timeEntry.StartTime:dd-MM-yyyy}, " +
                         $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                         $"Uren: {totalHours:F2}, " +
                         (!string.IsNullOrEmpty(notes) ? $"Admin opmerkingen: {notes}, " : "") +
                         $"Vorige status: {oldStatus}"
            };
        }

        // Add activities to context
        _context.Activities.Add(activityForOwner);
        _context.Activities.Add(activityForAdmin);
        if (activityForManager != null)
        {
            _context.Activities.Add(activityForManager);
        }

        // Mark time entry as modified
        _context.Entry(timeEntry).State = EntityState.Modified;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine($"Successfully approved time entry {id} by admin {adminId}");

        return Ok(new
        {
            success = true,
            message = $"Urenregistratie {actionText}",
            newStatus = "goedgekeurd",
            hoursAffected = totalHours,
            userId = timeEntry.UserId,
            processedBy = new
            {
                id = adminUser.Id,
                fullName = $"{adminUser.FirstName} {adminUser.LastName}",
                rank = adminUser.Rank
            },
            processedDate = DateTime.Now,
            processingNotes = notes,
            oldStatus = oldStatus,
            timeEntryDetails = new
            {
                id = timeEntry.Id,
                date = timeEntry.StartTime.ToString("dd-MM-yyyy"),
                startTime = timeEntry.StartTime.ToString("HH:mm"),
                endTime = timeEntry.EndTime.ToString("HH:mm"),
                project = timeEntry.Project?.Name ?? "Onbekend",
                company = timeEntry.Project?.ProjectGroup?.Company?.Name ?? "Onbekend",
                user = new
                {
                    id = timeEntry.User?.Id,
                    fullName = timeEntry.User != null ? $"{timeEntry.User.FirstName} {timeEntry.User.LastName}" : "Onbekend"
                },
                totalHours = totalHours,
                breakMinutes = timeEntry.BreakMinutes,
                notes = timeEntry.Notes
            }
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error approving time entry {id}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        await transaction.RollbackAsync();
        return BadRequest($"Fout bij goedkeuren urenregistratie: {ex.Message}");
    }
}
    /// <summary>
/// Admin rejects a time entry - can reject any entry regardless of status
/// </summary>
[HttpPut("time-entries/{id}/reject")]
public async Task<IActionResult> RejectTimeEntryAsAdmin(int id, [FromBody] JsonElement requestBody)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"Admin rejecting time entry {id}");

        var timeEntry = await _context.TimeEntries
            .Include(te => te.User)
                .ThenInclude(u => u.Manager)
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .FirstOrDefaultAsync(te => te.Id == id);

        if (timeEntry == null)
        {
            Console.WriteLine($"Time entry {id} not found");
            return NotFound("Urenregistratie niet gevonden");
        }

        // Extract parameters from request body
        int? adminId = null;
        string notes = null;

        if (requestBody.TryGetProperty("adminId", out var adminIdProp))
        {
            if (adminIdProp.TryGetInt32(out var adminIdValue))
            {
                adminId = adminIdValue;
            }
        }

        if (requestBody.TryGetProperty("notes", out var notesProp))
        {
            notes = notesProp.GetString();
        }

        Console.WriteLine($"Extracted - AdminId: {adminId}, Notes: {notes}");

        // Validate required fields
        if (!adminId.HasValue)
        {
            Console.WriteLine("AdminId is missing");
            return BadRequest("AdminId is verplicht");
        }

        if (string.IsNullOrWhiteSpace(notes))
        {
            Console.WriteLine("Processing notes required for rejection");
            return BadRequest("Afkeuringsreden is verplicht");
        }

        // Verify the admin user exists and has admin rights
        var adminUser = await _context.Users.FindAsync(adminId.Value);
        if (adminUser == null)
        {
            Console.WriteLine($"Admin user {adminId} not found");
            return BadRequest("Admin gebruiker niet gevonden");
        }

        if (adminUser.Rank != "admin")
        {
            Console.WriteLine($"User {adminId} is not admin: {adminUser.Rank}");
            return BadRequest("Alleen admins kunnen urenregistraties afkeuren via deze functie");
        }

        // Store old status for activity logging
        var oldStatus = timeEntry.Status;

        // Update time entry with rejection
        timeEntry.Status = "afgekeurd";
        timeEntry.ProcessedBy = adminId.Value;
        timeEntry.ProcessedDate = DateTime.Now;
        timeEntry.ProcessingNotes = notes;

        // Create activities for relevant parties
        var actionText = "afgekeurd door admin";

        // Activity for the time entry owner
        var activityForOwner = new Activity
        {
            UserId = timeEntry.UserId,
            Type = "timeentry",
            Action = "admin_rejected",
            Message = $"Urenregistratie van {timeEntry.StartTime:dd-MM-yyyy} is {actionText}",
            Details = $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                     $"Bedrijf: {timeEntry.Project?.ProjectGroup?.Company?.Name ?? "Onbekend"}, " +
                     $"Uren: {(timeEntry.EndTime - timeEntry.StartTime).TotalHours - (timeEntry.BreakMinutes / 60.0):F2}, " +
                     $"Admin reden: {notes}, " +
                     $"Vorige status: {oldStatus}"
        };

        // Activity for the admin who rejected
        var activityForAdmin = new Activity
        {
            UserId = adminId.Value,
            Type = "timeentry_admin",
            Action = "rejected_entry",
            Message = $"Urenregistratie van {timeEntry.User?.FirstName} {timeEntry.User?.LastName} afgekeurd",
            Details = $"Datum: {timeEntry.StartTime:dd-MM-yyyy}, " +
                     $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                     $"Uren: {(timeEntry.EndTime - timeEntry.StartTime).TotalHours - (timeEntry.BreakMinutes / 60.0):F2}, " +
                     $"Reden: {notes}, " +
                     $"Vorige status: {oldStatus}"
        };

        // Activity for the user's manager (if exists and different from admin)
        Activity activityForManager = null;
        if (timeEntry.User?.ManagerId.HasValue == true && timeEntry.User.ManagerId != adminId)
        {
            activityForManager = new Activity
            {
                UserId = timeEntry.User.ManagerId.Value,
                Type = "timeentry_manager",
                Action = "team_entry_admin_rejected",
                Message = $"Urenregistratie van teamlid {timeEntry.User.FirstName} {timeEntry.User.LastName} is afgekeurd door admin",
                Details = $"Datum: {timeEntry.StartTime:dd-MM-yyyy}, " +
                         $"Project: {timeEntry.Project?.Name ?? "Onbekend"}, " +
                         $"Uren: {(timeEntry.EndTime - timeEntry.StartTime).TotalHours - (timeEntry.BreakMinutes / 60.0):F2}, " +
                         $"Admin reden: {notes}, " +
                         $"Vorige status: {oldStatus}"
            };
        }

        // Add activities to context
        _context.Activities.Add(activityForOwner);
        _context.Activities.Add(activityForAdmin);
        if (activityForManager != null)
        {
            _context.Activities.Add(activityForManager);
        }

        // Mark time entry as modified
        _context.Entry(timeEntry).State = EntityState.Modified;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine($"Successfully rejected time entry {id} by admin {adminId}");

        return Ok(new
        {
            success = true,
            message = $"Urenregistratie {actionText}",
            newStatus = "afgekeurd",
            hoursAffected = (timeEntry.EndTime - timeEntry.StartTime).TotalHours - (timeEntry.BreakMinutes / 60.0),
            userId = timeEntry.UserId,
            processedBy = new
            {
                id = adminUser.Id,
                fullName = $"{adminUser.FirstName} {adminUser.LastName}",
                rank = adminUser.Rank
            },
            processedDate = DateTime.Now,
            processingNotes = notes,
            oldStatus = oldStatus,
            timeEntryDetails = new
            {
                id = timeEntry.Id,
                date = timeEntry.StartTime.ToString("dd-MM-yyyy"),
                project = timeEntry.Project?.Name ?? "Onbekend",
                company = timeEntry.Project?.ProjectGroup?.Company?.Name ?? "Onbekend",
                user = new
                {
                    id = timeEntry.User?.Id,
                    fullName = timeEntry.User != null ? $"{timeEntry.User.FirstName} {timeEntry.User.LastName}" : "Onbekend"
                }
            }
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error rejecting time entry {id}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        await transaction.RollbackAsync();
        return BadRequest($"Fout bij afkeuren urenregistratie: {ex.Message}");
    }
}
    /// <summary>
/// UPDATED: Get vacation requests for admin - show manager-approved AND direct admin requests
/// </summary>
[HttpGet("vacation-requests")]
public async Task<ActionResult<IEnumerable<object>>> GetAllVacationRequests()
{
    try
    {
        var requests = await _context.VacationRequests
            .Include(vr => vr.User)
                .ThenInclude(u => u.Manager)
            .Include(vr => vr.ManagerApprovedByUser) // Include manager approval info
            .Include(vr => vr.ProcessedByUser) // Include processing admin info
            .Where(vr => vr.Status == "manager_approved" || vr.Status == "approved" || vr.Status == "rejected") // Show manager-approved and processed
            .OrderByDescending(vr => vr.StartDate)
            .ToListAsync();
            
        var result = requests.Select(vr => new
        {
            vr.Id,
            vr.UserId,
            vr.StartDate,
            vr.EndDate,
            vr.Hours,
            vr.Reason,
            vr.Status,
            vr.RequestDate,
            
            // UPDATED: Enhanced approval stage detection
            ApprovalStage = vr.Status switch
            {
                "pending" => "Pending Manager Approval",
                "manager_approved" => GetApprovalStageText(vr), // Dynamic text based on user type
                "approved" => "Fully Approved",
                "rejected" => "Rejected",
                _ => "Unknown Status"
            },
            NextApprover = vr.Status switch
            {
                "pending" => "Manager",
                "manager_approved" => "Admin",
                "approved" => "None - Completed", 
                "rejected" => "None - Rejected",
                _ => "Unknown"
            },
            
            // UPDATED: Enhanced approval path tracking
            ApprovalPath = DetermineApprovalPath(vr),
            IsDirectAdminRequest = IsDirectAdminRequest(vr), // Flag for direct admin requests
            
            // FIXED: Always include manager approval tracking (even for direct admin requests)
            ManagerApprovedBy = vr.ManagerApprovedBy,
            ManagerApprovedDate = vr.ManagerApprovedDate,
            ManagerApprovalNotes = vr.ManagerApprovalNotes,
            
            // Admin final processing tracking
            ProcessedBy = vr.ProcessedBy,
            ProcessedDate = vr.ProcessedDate,
            ProcessingNotes = vr.ProcessingNotes,
            
            WorkingDays = vr.Hours / 8,
            User = vr.User != null ? new { 
                vr.User.Id, 
                vr.User.FirstName,
                vr.User.LastName,
                FullName = $"{vr.User.FirstName} {vr.User.LastName}",
                Rank = vr.User.Rank,
                ManagerId = vr.User.ManagerId,
                ManagerIds = vr.User.ManagerIds,
                Manager = vr.User.Manager != null ? new
                {
                    Id = vr.User.Manager.Id,
                    FirstName = vr.User.Manager.FirstName,
                    LastName = vr.User.Manager.LastName,
                    FullName = $"{vr.User.Manager.FirstName} {vr.User.Manager.LastName}",
                    Rank = vr.User.Manager.Rank
                } : null
            } : null,
            
            // FIXED: Always try to get manager approval user info
            ManagerApprovedByUser = vr.ManagerApprovedByUser != null ? new
            {
                Id = vr.ManagerApprovedByUser.Id,
                FirstName = vr.ManagerApprovedByUser.FirstName,
                LastName = vr.ManagerApprovedByUser.LastName,
                FullName = $"{vr.ManagerApprovedByUser.FirstName} {vr.ManagerApprovedByUser.LastName}",
                Rank = vr.ManagerApprovedByUser.Rank
            } : null,
            
            // Final admin processor
            ProcessedByUser = vr.ProcessedByUser != null ? new
            {
                Id = vr.ProcessedByUser.Id,
                FirstName = vr.ProcessedByUser.FirstName,
                LastName = vr.ProcessedByUser.LastName,
                FullName = $"{vr.ProcessedByUser.FirstName} {vr.ProcessedByUser.LastName}",
                Rank = vr.ProcessedByUser.Rank
            } : null,
            
            // Helper properties
            HasBeenProcessed = vr.ProcessedBy.HasValue,
            ProcessingDuration = vr.ProcessedDate.HasValue 
                ? (vr.ProcessedDate.Value - vr.RequestDate).TotalDays : (double?)null,
            CanBeProcessed = vr.Status == "manager_approved", // Only manager-approved requests can be processed by admin
            
            // Manager approval duration (for direct requests, this will be 0 or very small)
            ManagerApprovalDuration = vr.ManagerApprovedDate.HasValue
                ? (vr.ManagerApprovedDate.Value - vr.RequestDate).TotalDays : (double?)null
        }).ToList();

        Console.WriteLine($"Returning {result.Count} vacation requests for admin (manager-approved, direct admin, and processed)");
        
        // DEBUG: Log each request's manager approval data
        foreach (var request in result)
        {
            Console.WriteLine($"Request {request.Id}: ManagerApprovedBy={request.ManagerApprovedBy}, ManagerApprovedByUser={request.ManagerApprovedByUser?.FullName}, IsDirectAdmin={request.IsDirectAdminRequest}");
        }
        
        return Ok(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error in GetAllVacationRequests: {ex.Message}");
        return StatusCode(500, $"Error fetching vacation requests: {ex.Message}");
    }
}

// Helper methods for enhanced approval tracking
private string GetApprovalStageText(VacationRequest vr)
{
    if (IsDirectAdminRequest(vr))
    {
        return "Direct Admin Approval Required";
    }
    return "Pending Admin Approval";
}

private string DetermineApprovalPath(VacationRequest vr)
{
    if (IsDirectAdminRequest(vr))
    {
        return "direct_admin";
    }
    return "two_step";
}

private bool IsDirectAdminRequest(VacationRequest vr)
{
    // Check if this is a direct admin request (manager/admin self-approval)
    return vr.ManagerApprovedBy.HasValue && 
           vr.ManagerApprovedBy == vr.UserId && 
           vr.User != null && 
           (vr.User.Rank == "manager" || vr.User.Rank == "admin");
}
/// <summary>
/// UPDATED: Admin processes vacation request (final step) - can only process "manager_approved" requests (TWO-STEP APPROVAL)
/// </summary>
[HttpPut("vacation-requests/{id}")]
public async Task<IActionResult> ProcessVacationRequestAsAdmin(int id, [FromBody] JsonElement requestBody)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"Admin processing vacation request {id}");

        var request = await _context.VacationRequests
            .Include(vr => vr.User)
                .ThenInclude(u => u.Manager)
            .Include(vr => vr.ManagerApprovedByUser) // NEW: Include manager approval info
            .FirstOrDefaultAsync(vr => vr.Id == id);
        
        if (request == null) 
        {
            Console.WriteLine($"Request {id} not found");
            return NotFound("Vakantie-aanvraag niet gevonden");
        }

        // VALIDATION: Only manager-approved requests can be processed by admin
        if (request.Status != "manager_approved")
        {
            Console.WriteLine($"Request {id} is not manager-approved, current status: {request.Status}");
            var currentStage = request.Status switch
            {
                "pending" => "Pending Manager Approval",
                "manager_approved" => "Pending Admin Approval",
                "approved" => "Fully Approved", 
                "rejected" => "Rejected",
                _ => "Unknown Status"
            };
            return BadRequest($"Alleen aanvragen die zijn goedgekeurd door een manager kunnen door admins worden verwerkt. Huidige status: {currentStage}");
        }

        // Ensure request was approved by a manager
        if (!request.ManagerApprovedBy.HasValue || !request.ManagerApprovedDate.HasValue)
        {
            Console.WriteLine($"Request {id} is missing manager approval data");
            return BadRequest("Deze aanvraag mist manager goedkeuring informatie");
        }

        // Extract parameters from request body
        string status = null;
        int? processedByUserId = null;
        string processingNotes = null;

        if (requestBody.TryGetProperty("status", out var statusProp))
        {
            status = statusProp.GetString();
        }
        else if (requestBody.TryGetProperty("Status", out var statusPropPascal))
        {
            status = statusPropPascal.GetString();
        }

        if (requestBody.TryGetProperty("processedByUserId", out var processedByProp))
        {
            if (processedByProp.TryGetInt32(out var processedByValue))
            {
                processedByUserId = processedByValue;
            }
        }
        else if (requestBody.TryGetProperty("ProcessedByUserId", out var processedByPropPascal))
        {
            if (processedByPropPascal.TryGetInt32(out var processedByValue))
            {
                processedByUserId = processedByValue;
            }
        }

        if (requestBody.TryGetProperty("processingNotes", out var notesProp))
        {
            processingNotes = notesProp.GetString();
        }
        else if (requestBody.TryGetProperty("ProcessingNotes", out var notesPropPascal))
        {
            processingNotes = notesPropPascal.GetString();
        }

        Console.WriteLine($"Extracted - Status: {status}, ProcessedBy: {processedByUserId}, Notes: {processingNotes}");

        // Validate required fields
        if (string.IsNullOrEmpty(status) || (status != "approved" && status != "rejected"))
        {
            Console.WriteLine($"Invalid status: {status}");
            return BadRequest("Status moet 'approved' of 'rejected' zijn");
        }

        if (!processedByUserId.HasValue)
        {
            Console.WriteLine("ProcessedByUserId is missing");
            return BadRequest("ProcessedByUserId is verplicht");
        }

        if (status == "rejected" && string.IsNullOrWhiteSpace(processingNotes))
        {
            Console.WriteLine("Processing notes required for rejection");
            return BadRequest("ProcessingNotes zijn verplicht bij afwijzing");
        }

        // Verify the processing user exists and is an admin
        var processingUser = await _context.Users.FindAsync(processedByUserId.Value);
        if (processingUser == null)
        {
            Console.WriteLine($"Processing user {processedByUserId} not found");
            return BadRequest("Processing user niet gevonden");
        }
        
        if (processingUser.Rank != "admin")
        {
            Console.WriteLine($"Processing user {processedByUserId} is not admin: {processingUser.Rank}");
            return BadRequest("Alleen admins kunnen de finale goedkeuring geven");
        }

        // Check vacation balance again for final approval
        if (status == "approved")
        {
            Console.WriteLine($"Checking vacation balance for user {request.UserId}");
            var balance = await GetUserVacationBalance(request.UserId);
            var availableAfterApproval = balance.totalHours - balance.usedHours - request.Hours;
            
            Console.WriteLine($"User {request.UserId} balance: {balance.totalHours} total, {balance.usedHours} used, {request.Hours} requested");
            Console.WriteLine($"Available after approval: {availableAfterApproval}");
            
            if (availableAfterApproval < 0)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Gebruiker heeft onvoldoende vakantie-uren. Beschikbaar: {balance.totalHours - balance.usedHours} uur, Aangevraagd: {request.Hours} uur");
            }
        }

        // Update vacation request with final admin processing
        var oldStatus = request.Status;
        request.Status = status; // "approved" or "rejected"
        request.ProcessedBy = processedByUserId.Value;
        request.ProcessedDate = DateTime.Now;
        request.ProcessingNotes = processingNotes;

        // Create activities for requester, manager, and admin
        var actionText = status == "approved" ? "volledig goedgekeurd" : "afgekeurd door admin";
        
        // Activity for the requester
        var activityForRequester = new Activity
        {
            UserId = request.UserId,
            Type = "vacation",
            Action = status == "approved" ? "fully_approved" : "admin_rejected",
            Message = $"Vakantie-aanvraag van {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy} is {actionText}",
            Details = $"Uren: {request.Hours}" + 
                     (status == "rejected" && !string.IsNullOrEmpty(processingNotes) ? $", Admin reden: {processingNotes}" : "") +
                     $", Eerder goedgekeurd door manager: {request.ManagerApprovedByUser?.FirstName} {request.ManagerApprovedByUser?.LastName} op {request.ManagerApprovedDate:dd-MM-yyyy}"
        };

        // Activity for the admin processor
        var activityForProcessor = new Activity
        {
            UserId = processedByUserId.Value,
            Type = "vacation_admin",
            Action = status == "approved" ? "final_approved" : "final_rejected",
            Message = $"Vakantie-aanvraag van {request.User?.FirstName} {request.User?.LastName} {actionText}",
            Details = $"Periode: {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy}, Uren: {request.Hours}" +
                     (status == "rejected" && !string.IsNullOrEmpty(processingNotes) ? $", Reden: {processingNotes}" : "") +
                     $", Manager goedkeuring: {request.ManagerApprovedByUser?.FirstName} {request.ManagerApprovedByUser?.LastName} op {request.ManagerApprovedDate:dd-MM-yyyy}"
        };

        // Activity for the manager who initially approved (notification)
        Activity activityForManager = null;
        if (request.ManagerApprovedBy.HasValue)
        {
            activityForManager = new Activity
            {
                UserId = request.ManagerApprovedBy.Value,
                Type = "vacation_manager",
                Action = status == "approved" ? "request_fully_approved" : "request_admin_rejected",
                Message = $"Uw goedgekeurde vakantie-aanvraag van {request.User?.FirstName} {request.User?.LastName} is {actionText}",
                Details = $"Periode: {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy}, Uren: {request.Hours}" +
                         (status == "rejected" && !string.IsNullOrEmpty(processingNotes) ? $", Admin reden: {processingNotes}" : "") +
                         (!string.IsNullOrEmpty(request.ManagerApprovalNotes) ? $", Uw eerdere opmerkingen: {request.ManagerApprovalNotes}" : "")
            };
        }

        _context.Activities.Add(activityForRequester);
        _context.Activities.Add(activityForProcessor);
        if (activityForManager != null)
        {
            _context.Activities.Add(activityForManager);
        }
        
        _context.Entry(request).State = EntityState.Modified;
        
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine($"Successfully processed request {id} to status {status} by admin {processedByUserId}");

        return Ok(new { 
            success = true,
            message = $"Vakantie-aanvraag {actionText}", 
            newStatus = status,
            approvalStage = status == "approved" ? "Fully Approved" : "Rejected",
            hoursAffected = request.Hours,
            userId = request.UserId,
            processedBy = new
            {
                id = processingUser.Id,
                fullName = $"{processingUser.FirstName} {processingUser.LastName}",
                rank = processingUser.Rank
            },
            processedDate = DateTime.Now,
            managerApproval = new // NEW: Include manager approval info in response
            {
                approvedBy = new
                {
                    id = request.ManagerApprovedBy,
                    fullName = request.ManagerApprovedByUser != null ? 
                        $"{request.ManagerApprovedByUser.FirstName} {request.ManagerApprovedByUser.LastName}" : "Unknown"
                },
                approvedDate = request.ManagerApprovedDate,
                notes = request.ManagerApprovalNotes
            },
            userManager = request.User?.Manager != null ? new
            {
                id = request.User.Manager.Id,
                fullName = $"{request.User.Manager.FirstName} {request.User.Manager.LastName}"
            } : null
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error processing vacation request {id}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        await transaction.RollbackAsync();
        return BadRequest($"Fout bij verwerken vakantie-aanvraag: {ex.Message}");
    }
}

   
/// <summary>
/// UPDATED: Get vacation request stats - updated to reflect two-step approval process
/// </summary>
[HttpGet("vacation-requests/stats")]
public async Task<ActionResult<object>> GetVacationRequestStats()
{
    try
    {
        var currentYear = DateTime.Now.Year;
        var requests = await _context.VacationRequests
            .Include(v => v.User)
                .ThenInclude(u => u.Manager)
            .Include(v => v.ManagerApprovedByUser) // NEW: Include manager approval info
            .Include(v => v.ProcessedByUser)
            .Where(v => v.StartDate.Year == currentYear)
            .ToListAsync();

        var stats = new
        {
            totalRequests = requests.Count,
            pendingManagerApproval = requests.Count(r => r.Status == "pending"), // NEW: Waiting for manager
            pendingAdminApproval = requests.Count(r => r.Status == "manager_approved"), // NEW: Waiting for admin
            fullyApproved = requests.Count(r => r.Status == "approved"), // UPDATED: Fully approved
            rejected = requests.Count(r => r.Status == "rejected"),
            totalHoursRequested = requests.Sum(r => r.Hours),
            totalHoursApproved = requests.Where(r => r.Status == "approved").Sum(r => r.Hours),
            
            // UPDATED: Processing times for both steps
            averageManagerApprovalTime = requests.Where(r => r.ManagerApprovedDate.HasValue)
                .Select(r => (r.ManagerApprovedDate!.Value - r.RequestDate).TotalDays)
                .DefaultIfEmpty(0)
                .Average(),
            averageAdminProcessingTime = requests.Where(r => r.ProcessedDate.HasValue && r.ManagerApprovedDate.HasValue)
                .Select(r => (r.ProcessedDate!.Value - r.ManagerApprovedDate!.Value).TotalDays)
                .DefaultIfEmpty(0)
                .Average(),
            averageTotalProcessingTime = requests.Where(r => r.ProcessedDate.HasValue)
                .Select(r => (r.ProcessedDate!.Value - r.RequestDate).TotalDays)
                .DefaultIfEmpty(0)
                .Average(),
                
            // Manager approval statistics
            topManagerApprovers = requests
                .Where(r => r.ManagerApprovedByUser != null)
                .GroupBy(r => new { r.ManagerApprovedBy, r.ManagerApprovedByUser!.FirstName, r.ManagerApprovedByUser.LastName })
                .Select(g => new
                {
                    managerId = g.Key.ManagerApprovedBy,
                    managerName = $"{g.Key.FirstName} {g.Key.LastName}",
                    approvedCount = g.Count(),
                    averageApprovalTime = g.Where(r => r.ManagerApprovedDate.HasValue)
                        .Select(r => (r.ManagerApprovedDate!.Value - r.RequestDate).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average()
                })
                .OrderByDescending(x => x.approvedCount)
                .Take(5)
                .ToList(),
                
            // Admin processing statistics
            topAdminProcessors = requests
                .Where(r => r.ProcessedByUser != null)
                .GroupBy(r => new { r.ProcessedBy, r.ProcessedByUser!.FirstName, r.ProcessedByUser.LastName, r.ProcessedByUser.Rank })
                .Select(g => new
                {
                    adminId = g.Key.ProcessedBy,
                    adminName = $"{g.Key.FirstName} {g.Key.LastName}",
                    adminType = g.Key.Rank,
                    processedCount = g.Count(),
                    approvedCount = g.Count(r => r.Status == "approved"),
                    rejectedCount = g.Count(r => r.Status == "rejected"),
                    averageProcessingTime = g.Where(r => r.ProcessedDate.HasValue && r.ManagerApprovedDate.HasValue)
                        .Select(r => (r.ProcessedDate!.Value - r.ManagerApprovedDate!.Value).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average()
                })
                .OrderByDescending(x => x.processedCount)
                .Take(5)
                .ToList(),
                
            // Processing by user type breakdown
            processingByRank = requests
                .Where(r => r.ProcessedByUser != null)
                .GroupBy(r => r.ProcessedByUser.Rank)
                .Select(g => new
                {
                    rank = g.Key,
                    totalProcessed = g.Count(),
                    approved = g.Count(r => r.Status == "approved"),
                    rejected = g.Count(r => r.Status == "rejected"),
                    averageProcessingTime = g.Where(r => r.ProcessedDate.HasValue && r.ManagerApprovedDate.HasValue)
                        .Select(r => (r.ProcessedDate!.Value - r.ManagerApprovedDate!.Value).TotalDays)
                        .DefaultIfEmpty(0)
                        .Average()
                })
                .ToList(),
                
            // Requests by user type
            requestsByRank = requests
                .Where(r => r.User != null)
                .GroupBy(r => r.User.Rank)
                .Select(g => new
                {
                    rank = g.Key,
                    totalRequests = g.Count(),
                    pendingManager = g.Count(r => r.Status == "pending"),
                    pendingAdmin = g.Count(r => r.Status == "manager_approved"),
                    approved = g.Count(r => r.Status == "approved"),
                    rejected = g.Count(r => r.Status == "rejected"),
                    averageHours = g.Average(r => r.Hours)
                })
                .ToList()
        };

        return Ok(stats);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error getting vacation request stats: {ex.Message}");
        return BadRequest($"Fout bij ophalen statistieken: {ex.Message}");
    }
}
    /// <summary>
    /// Krijg vakantie balans voor een specifieke gebruiker (admin view)
    /// </summary>
    [HttpGet("vacation-balance/{userId}")]
    public async Task<ActionResult<object>> GetUserVacationBalanceAdmin(int userId)
    {
        try
        {
            var balance = await GetUserVacationBalance(userId);
            var user = await _context.Users
                .Include(u => u.Manager) // NEW: Include manager info
                .FirstOrDefaultAsync(u => u.Id == userId);
            
            if (user == null)
                return NotFound("Gebruiker niet gevonden");

            return Ok(new
            {
                user = new
                {
                    id = user.Id,
                    fullName = $"{user.FirstName} {user.LastName}",
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    Rank = user.Rank, // NEW
                    managerId = user.ManagerId, // NEW
                    manager = user.Manager != null ? new
                    {
                        id = user.Manager.Id,
                        fullName = $"{user.Manager.FirstName} {user.Manager.LastName}",
                        Rank = user.Manager.Rank
                    } : null
                },
                balance = new
                {
                    balance.totalHours,
                    balance.usedHours,
                    balance.pendingHours,
                    balance.remainingHours,
                    balance.year,
                    totalDays = balance.totalHours / 8,
                    usedDays = balance.usedHours / 8,
                    pendingDays = balance.pendingHours / 8,
                    remainingDays = balance.remainingHours / 8
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting user vacation balance: {ex.Message}");
            return BadRequest($"Fout bij ophalen vakantie balans: {ex.Message}");
        }
    }

    /// <summary>
    /// Krijg overzicht van alle gebruikers met hun vakantie balans - UPDATED with user hierarchy info
    /// </summary>
    [HttpGet("vacation-overview")]
    public async Task<ActionResult<IEnumerable<object>>> GetVacationOverview()
    {
        try
        {
            var users = await _context.Users
                .Include(u => u.Manager) // NEW: Include manager info
                .ToListAsync();
            var overview = new List<object>();

            foreach (var user in users)
            {
                var balance = await GetUserVacationBalance(user.Id);
                overview.Add(new
                {
                    user = new
                    {
                        id = user.Id,
                        fullName = $"{user.FirstName} {user.LastName}",
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        Rank = user.Rank, // NEW
                        managerId = user.ManagerId, // NEW
                        manager = user.Manager != null ? new
                        {
                            id = user.Manager.Id,
                            fullName = $"{user.Manager.FirstName} {user.Manager.LastName}"
                        } : null
                    },
                    balance = new
                    {
                        balance.totalHours,
                        balance.usedHours,
                        balance.pendingHours,
                        balance.remainingHours,
                        utilizationPercentage = balance.totalHours > 0 ? Math.Round((balance.usedHours / balance.totalHours) * 100, 1) : 0
                    }
                });
            }

            return Ok(overview.OrderBy(x => ((dynamic)x).user.fullName));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting vacation overview: {ex.Message}");
            return BadRequest($"Fout bij ophalen vakantie overzicht: {ex.Message}");
        }
    }

    /// <summary>
    /// NEW: Get user hierarchy information
    /// </summary>
    [HttpGet("user-hierarchy")]
    public async Task<ActionResult<object>> GetUserHierarchy()
    {
        try
        {
            var users = await _context.Users
                .Include(u => u.Manager)
                .Include(u => u.ManagedUsers)
                .ToListAsync();

            var hierarchy = new
            {
                admins = users
                    .Where(u => u.Rank == "admin")
                    .Select(u => new
                    {
                        id = u.Id,
                        fullName = $"{u.FirstName} {u.LastName}",
                        Rank = u.Rank,
                        function = u.Function
                    })
                    .ToList(),
                    
                managers = users
                    .Where(u => u.Rank == "manager")
                    .Select(u => new
                    {
                        id = u.Id,
                        fullName = $"{u.FirstName} {u.LastName}",
                        Rank = u.Rank,
                        function = u.Function,
                        teamSize = u.ManagedUsers.Count,
                        teamMembers = u.ManagedUsers.Select(tm => new
                        {
                            id = tm.Id,
                            fullName = $"{tm.FirstName} {tm.LastName}",
                            function = tm.Function
                        }).ToList()
                    })
                    .ToList(),
                    
                unassignedUsers = users
                    .Where(u => u.Rank == "user" && u.ManagerId == null)
                    .Select(u => new
                    {
                        id = u.Id,
                        fullName = $"{u.FirstName} {u.LastName}",
                        Rank = u.Rank,
                        function = u.Function
                    })
                    .ToList()
            };

            return Ok(hierarchy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting user hierarchy: {ex.Message}");
            return BadRequest($"Fout bij ophalen gebruikershiërarchie: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Maak een nieuw project aan
    /// </summary>
    [HttpPost("projects")]
    public async Task<IActionResult> CreateProject([FromBody] ProjectDto projectDto)
    {
        try
        {
            var project = new Project
            {
                Name = projectDto.Name,
                ProjectGroupId = projectDto.ProjectGroupId
            };
            
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"Created new project: {project.Name} (ID: {project.Id})");
            return Ok(project);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating project: {ex.Message}");
            return BadRequest($"Fout bij aanmaken project: {ex.Message}");
        }
    }

    /// <summary>
    /// Helper methode: Haal vakantie balans voor gebruiker op
    /// </summary>
    private async Task<(double totalHours, double usedHours, double pendingHours, double remainingHours, int year)> GetUserVacationBalance(int userId)
    {
        var currentYear = DateTime.Now.Year;
        
        var userRequests = await _context.VacationRequests
            .Where(v => v.UserId == userId && v.StartDate.Year == currentYear)
            .ToListAsync();

        var usedHours = userRequests
            .Where(v => v.Status == "approved")
            .Sum(v => v.Hours);

        var pendingHours = userRequests
            .Where(v => v.Status == "pending")
            .Sum(v => v.Hours);

        var totalHours = 200.0; // Aanpasbaar per gebruiker/contract
        var remainingHours = totalHours - usedHours - pendingHours;

        return (totalHours, usedHours, pendingHours, Math.Max(0, remainingHours), currentYear);
    }
}

/// <summary>
/// DTO voor het aanmaken van projecten
/// </summary>
public class ProjectDto
{
    public string Name { get; set; }
    public int ProjectGroupId { get; set; }
}
