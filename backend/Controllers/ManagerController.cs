using Microsoft.AspNetCore.Mvc;

namespace backend.controllers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

[Route("api/manager")]
[ApiController]
public class ManagerController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public ManagerController(ClockwiseDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get stats for the manager dashboard
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
        
        // NEW: Manager-specific stats
        var managersCount = await _context.Users.CountAsync(u => u.Rank == "manager");
        var adminsCount = await _context.Users.CountAsync(u => u.Rank == "admin");
        
        return new
        {
            totalUsers,
            totalProjects,
            totalHours,
            hoursThisMonth,
            activeProjects,
            pendingVacations,
            managersCount, // NEW
            adminsCount // NEW
        };
    }

    /// <summary>
    /// FIXED: Get time entries for the manager's team only - now supports multiple managers
    /// </summary>
    [HttpGet("time-entries")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllTimeEntries([FromQuery] int? managerId = null)
    {
        try
        {
            // If managerId is not provided, try to get from authentication context
            // For now, managerId must be provided as query parameter
            if (!managerId.HasValue)
            {
                return BadRequest("Manager ID is required");
            }

            // Verify the requesting user is a manager
            var manager = await _context.Users.FindAsync(managerId.Value);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Invalid manager ID");
            }

            // FIXED: Get all users and filter in code to support multiple managers
            var allUsers = await _context.Users.ToListAsync();
            var managedUserIds = allUsers
                .Where(u => u.GetManagerIdsList().Contains(managerId.Value))
                .Select(u => u.Id)
                .ToList();

            Console.WriteLine($"Manager {managerId} manages users: {string.Join(", ", managedUserIds)}");

            // Get entries from users managed by this manager
            var entries = await _context.TimeEntries
                .Where(te => managedUserIds.Contains(te.UserId)) // Use the filtered user IDs
                .Include(te => te.User)
                    .ThenInclude(u => u.Manager)
                .Include(te => te.ProcessedByUser)
                .Include(te => te.Project)
                    .ThenInclude(p => p.ProjectGroup)
                        .ThenInclude(pg => pg.Company)
                .OrderByDescending(te => te.StartTime)
                .ToListAsync();
                
            var result = entries.Select(te => new
            {
                // Main TimeEntry properties
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
                
                // Processing tracking fields
                processedBy = te.ProcessedBy,
                processedDate = te.ProcessedDate,
                processingNotes = te.ProcessingNotes,
                requestDate = te.RequestDate,
                
                // User object with manager info
                user = te.User != null ? new {
                    id = te.User.Id,
                    firstName = te.User.FirstName,
                    lastName = te.User.LastName,
                    fullName = $"{te.User.FirstName} {te.User.LastName}".Trim(),
                    Rank = te.User.Rank,
                    managerId = te.User.ManagerId,
                    managerIds = te.User.ManagerIds, // Include multiple managers
                    manager = te.User.Manager != null ? new
                    {
                        id = te.User.Manager.Id,
                        firstName = te.User.Manager.FirstName,
                        lastName = te.User.Manager.LastName,
                        fullName = $"{te.User.Manager.FirstName} {te.User.Manager.LastName}"
                    } : null
                } : null,
                
                // ProcessedBy user info
                processedByUser = te.ProcessedByUser != null ? new
                {
                    id = te.ProcessedByUser.Id,
                    firstName = te.ProcessedByUser.FirstName,
                    lastName = te.ProcessedByUser.LastName,
                    fullName = $"{te.ProcessedByUser.FirstName} {te.ProcessedByUser.LastName}",
                    Rank = te.ProcessedByUser.Rank
                } : null,
                
                // Project object
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
                hasBeenProcessed = te.ProcessedBy.HasValue,
                canApprove = te.Status == "ingeleverd" && te.UserId != managerId.Value // Manager can't approve own entries
            }).ToList();

            Console.WriteLine($"Returning {result.Count} time entries for manager {managerId}");
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAllTimeEntries: {ex.Message}");
            return StatusCode(500, $"Error fetching time entries: {ex.Message}");
        }
    }
    
    /// <summary>
    /// FIXED: Get time entries for a specific manager's team - now supports multiple managers
    /// </summary>
    [HttpGet("time-entries/team/{managerId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetTeamTimeEntries(int managerId)
    {
        try
        {
            // Verify the manager exists
            var manager = await _context.Users.FindAsync(managerId);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Ongeldige manager");
            }

            // FIXED: Get all users and filter in code to support multiple managers
            var allUsers = await _context.Users.ToListAsync();
            var managedUserIds = allUsers
                .Where(u => u.GetManagerIdsList().Contains(managerId))
                .Select(u => u.Id)
                .ToList();

            Console.WriteLine($"Manager {managerId} manages users: {string.Join(", ", managedUserIds)}");

            var entries = await _context.TimeEntries
                .Where(te => managedUserIds.Contains(te.UserId)) // Use the filtered user IDs
                .Include(te => te.User)
                .Include(te => te.ProcessedByUser)
                .Include(te => te.Project)
                    .ThenInclude(p => p.ProjectGroup)
                        .ThenInclude(pg => pg.Company)
                .OrderByDescending(te => te.StartTime)
                .ToListAsync();

            var result = entries.Select(te => new
            {
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
                processedBy = te.ProcessedBy,
                processedDate = te.ProcessedDate,
                processingNotes = te.ProcessingNotes,
                requestDate = te.RequestDate,
                user = te.User != null ? new {
                    id = te.User.Id,
                    firstName = te.User.FirstName,
                    lastName = te.User.LastName,
                    fullName = $"{te.User.FirstName} {te.User.LastName}".Trim(),
                    managerIds = te.User.ManagerIds // Include multiple managers info
                } : null,
                processedByUser = te.ProcessedByUser != null ? new
                {
                    id = te.ProcessedByUser.Id,
                    firstName = te.ProcessedByUser.FirstName,
                    lastName = te.ProcessedByUser.LastName,
                    fullName = $"{te.ProcessedByUser.FirstName} {te.ProcessedByUser.LastName}"
                } : null,
                project = te.Project != null ? new {
                    id = te.Project.Id,
                    name = te.Project.Name,
                    projectGroup = te.Project.ProjectGroup != null ? new {
                        name = te.Project.ProjectGroup.Name,
                        company = te.Project.ProjectGroup.Company != null ? new {
                            name = te.Project.ProjectGroup.Company.Name
                        } : null
                    } : null
                } : null,
                totalHours = (te.EndTime - te.StartTime).TotalHours - (te.BreakMinutes / 60.0),
                canApprove = te.Status == "ingeleverd"
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTeamTimeEntries: {ex.Message}");
            return StatusCode(500, $"Error fetching team time entries: {ex.Message}");
        }
    }

    /// <summary>
    /// FIXED: Approve time entry - updated with proper manager validation for multiple managers
    /// </summary>
    [HttpPut("time-entries/{id}/approve")]
    public async Task<IActionResult> ApproveTimeEntry(int id, [FromBody] ApproveTimeEntryDto approvalDto)
    {
        try
        {
            var entry = await _context.TimeEntries
                .Include(te => te.User)
                .Include(te => te.Project)
                .FirstOrDefaultAsync(te => te.Id == id);

            if (entry == null)
                return NotFound("Time entry niet gevonden");

            // Validate manager ID is provided
            if (!approvalDto.ManagerId.HasValue)
            {
                return BadRequest("Manager ID is verplicht");
            }

            // Get the manager
            var manager = await _context.Users.FindAsync(approvalDto.ManagerId.Value);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Ongeldige manager");
            }

            // FIXED: Check if this manager can approve this entry using multiple managers support
            var userManagerIds = entry.User?.GetManagerIdsList() ?? new List<int>();
            if (!userManagerIds.Contains(manager.Id))
            {
                return Forbid($"U kunt alleen uren van uw eigen teamleden goedkeuren. User managers: [{string.Join(", ", userManagerIds)}], Your ID: {manager.Id}");
            }

            // Manager cannot approve their own entries
            if (entry.UserId == manager.Id)
            {
                return BadRequest("U kunt uw eigen uren niet goedkeuren");
            }

            // Only allow approval of submitted entries
            if (entry.Status != "ingeleverd")
            {
                return BadRequest("Alleen ingeleverde uren kunnen worden goedgekeurd");
            }

            // Update entry with processing info
            entry.Status = "goedgekeurd";
            entry.ProcessedBy = manager.Id;
            entry.ProcessedDate = DateTime.Now;
            entry.ProcessingNotes = approvalDto.Notes;

            _context.Entry(entry).State = EntityState.Modified;

            // Add activity
            var activity = new Activity
            {
                UserId = entry.UserId,
                Type = "time_entry",
                Action = "approved",
                Message = $"Uren voor {entry.StartTime:dd-MM-yyyy} goedgekeurd door {manager.FirstName} {manager.LastName}",
                Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
            };
            _context.Activities.Add(activity);

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Uren goedgekeurd",
                status = "goedgekeurd",
                processedBy = manager.Id,
                processedByName = $"{manager.FirstName} {manager.LastName}",
                processedDate = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error approving time entry {id}: {ex.Message}");
            return StatusCode(500, $"Error approving time entry: {ex.Message}");
        }
    }

    /// <summary>
    /// FIXED: Reject time entry - updated with proper manager validation for multiple managers
    /// </summary>
    [HttpPut("time-entries/{id}/reject")]
    public async Task<IActionResult> RejectTimeEntry(int id, [FromBody] RejectTimeEntryDto rejectionDto)
    {
        try
        {
            var entry = await _context.TimeEntries
                .Include(te => te.User)
                .Include(te => te.Project)
                .FirstOrDefaultAsync(te => te.Id == id);

            if (entry == null)
                return NotFound("Time entry niet gevonden");

            // Validate manager ID and notes
            if (!rejectionDto.ManagerId.HasValue)
            {
                return BadRequest("Manager ID is verplicht");
            }

            if (string.IsNullOrWhiteSpace(rejectionDto.Notes))
            {
                return BadRequest("Reden voor afkeuring is verplicht");
            }

            // Get the manager
            var manager = await _context.Users.FindAsync(rejectionDto.ManagerId.Value);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Ongeldige manager");
            }

            // FIXED: Check if this manager can reject this entry using multiple managers support
            var userManagerIds = entry.User?.GetManagerIdsList() ?? new List<int>();
            if (!userManagerIds.Contains(manager.Id))
            {
                return Forbid($"U kunt alleen uren van uw eigen teamleden afkeuren. User managers: [{string.Join(", ", userManagerIds)}], Your ID: {manager.Id}");
            }

            // Manager cannot reject their own entries
            if (entry.UserId == manager.Id)
            {
                return BadRequest("U kunt uw eigen uren niet afkeuren");
            }

            if (entry.Status != "ingeleverd")
            {
                return BadRequest("Alleen ingeleverde uren kunnen worden afgekeurd");
            }

            // Reject and revert to draft
            entry.Status = "opgeslagen";
            entry.ProcessedBy = manager.Id;
            entry.ProcessedDate = DateTime.Now;
            entry.ProcessingNotes = rejectionDto.Notes;

            _context.Entry(entry).State = EntityState.Modified;

            // Add activity
            var activity = new Activity
            {
                UserId = entry.UserId,
                Type = "time_entry",
                Action = "rejected",
                Message = $"Uren voor {entry.StartTime:dd-MM-yyyy} afgekeurd door {manager.FirstName} {manager.LastName}",
                Details = $"Project: {entry.Project?.Name ?? "Onbekend"}, Reden: {rejectionDto.Notes}"
            };
            _context.Activities.Add(activity);

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Uren afgekeurd en teruggezet naar concept",
                status = "opgeslagen",
                processedBy = manager.Id,
                processedByName = $"{manager.FirstName} {manager.LastName}",
                processedDate = DateTime.Now,
                rejectionReason = entry.ProcessingNotes
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error rejecting time entry {id}: {ex.Message}");
            return StatusCode(500, $"Error rejecting time entry: {ex.Message}");
        }
    }
    
    /// <summary>
    /// FIXED: Get vacation requests - now supports multiple managers
    /// </summary>
    [HttpGet("vacation-requests")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllVacationRequests([FromQuery] int? managerId = null)
    {
        try
        {
            // Get all users first to support multiple managers filtering
            var allUsers = await _context.Users.ToListAsync();
            
            var requests = await _context.VacationRequests
                .Include(vr => vr.User)
                    .ThenInclude(u => u.Manager) 
                .Include(vr => vr.ProcessedByUser) 
                .OrderByDescending(vr => vr.StartDate)
                .ToListAsync();

            // If managerId is provided, filter for that manager's team
            if (managerId.HasValue)
            {
                var managedUserIds = allUsers
                    .Where(u => u.GetManagerIdsList().Contains(managerId.Value))
                    .Select(u => u.Id)
                    .ToList();
                
                requests = requests.Where(vr => managedUserIds.Contains(vr.UserId)).ToList();
                Console.WriteLine($"Manager {managerId} has {requests.Count} vacation requests from team members: {string.Join(", ", managedUserIds)}");
            }
                
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
                    ManagerIds = vr.User.ManagerIds, // Include multiple managers
                    Manager = vr.User.Manager != null ? new
                    {
                        Id = vr.User.Manager.Id,
                        FirstName = vr.User.Manager.FirstName,
                        LastName = vr.User.Manager.LastName,
                        FullName = $"{vr.User.Manager.FirstName} {vr.User.Manager.LastName}"
                    } : null
                } : null,
                ProcessedByUser = vr.ProcessedByUser != null ? new
                {
                    Id = vr.ProcessedByUser.Id,
                    FirstName = vr.ProcessedByUser.FirstName,
                    LastName = vr.ProcessedByUser.LastName,
                    FullName = $"{vr.ProcessedByUser.FirstName} {vr.ProcessedByUser.LastName}",
                    Rank = vr.ProcessedByUser.Rank
                } : null
            }).ToList();

            Console.WriteLine($"Returning {result.Count} vacation requests");
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAllVacationRequests: {ex.Message}");
            return StatusCode(500, $"Error fetching vacation requests: {ex.Message}");
        }
    }
    
    /// <summary>
    /// FIXED: Process vacation request - updated with multiple managers support
    /// </summary>
    [HttpPut("vacation-requests/{id}")]
    public async Task<IActionResult> ProcessVacationRequest(int id, [FromBody] JsonElement requestBody)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            Console.WriteLine($"Processing vacation request {id}");

            var request = await _context.VacationRequests
                .Include(vr => vr.User)
                .FirstOrDefaultAsync(vr => vr.Id == id);
            
            if (request == null) 
            {
                return NotFound("Vakantie-aanvraag niet gevonden");
            }

            if (request.Status != "pending")
            {
                return BadRequest("Alleen aanvragen in behandeling kunnen worden verwerkt");
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

            // Validate required fields
            if (string.IsNullOrEmpty(status) || (status != "approved" && status != "rejected"))
            {
                return BadRequest("Status moet 'approved' of 'rejected' zijn");
            }

            if (!processedByUserId.HasValue)
            {
                return BadRequest("ProcessedByUserId is verplicht");
            }

            if (status == "rejected" && string.IsNullOrWhiteSpace(processingNotes))
            {
                return BadRequest("ProcessingNotes zijn verplicht bij afwijzing");
            }

            // Verify the processing user exists and has permission
            var processingUser = await _context.Users.FindAsync(processedByUserId.Value);
            if (processingUser == null)
            {
                return BadRequest("Processing user niet gevonden");
            }
            
            if (processingUser.Rank != "manager" && processingUser.Rank != "admin")
            {
                return BadRequest("Alleen managers en admins kunnen vakantie-aanvragen verwerken");
            }

            // FIXED: Managers can only process requests from their team members (supports multiple managers)
            if (processingUser.Rank == "manager")
            {
                var userManagerIds = request.User?.GetManagerIdsList() ?? new List<int>();
                if (!userManagerIds.Contains(processingUser.Id))
                {
                    return BadRequest($"Managers kunnen alleen aanvragen van hun teamleden verwerken. User managers: [{string.Join(", ", userManagerIds)}], Your ID: {processingUser.Id}");
                }
            }

            // Check vacation balance for approvals
            if (status == "approved")
            {
                var balance = await GetUserVacationBalance(request.UserId);
                var availableAfterApproval = balance.totalHours - balance.usedHours - request.Hours;
                
                if (availableAfterApproval < 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest($"Gebruiker heeft onvoldoende vakantie-uren. Beschikbaar: {balance.totalHours - balance.usedHours} uur, Aangevraagd: {request.Hours} uur");
                }
            }

            // Update vacation request
            var actionText = status == "approved" ? "goedgekeurd" : "afgekeurd";
            request.Status = status;
            request.ProcessedBy = processedByUserId.Value;
            request.ProcessedDate = DateTime.Now;
            request.ProcessingNotes = processingNotes;

            // Create activities
            var activityForRequester = new Activity
            {
                UserId = request.UserId,
                Type = "vacation",
                Action = status,
                Message = $"Vakantie-aanvraag van {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy} is {actionText} door {processingUser.FirstName} {processingUser.LastName}",
                Details = $"Uren: {request.Hours}" + 
                         (status == "rejected" && !string.IsNullOrEmpty(processingNotes) ? $", Reden: {processingNotes}" : "")
            };

            var activityForProcessor = new Activity
            {
                UserId = processedByUserId.Value,
                Type = "vacation_manager", 
                Action = status == "approved" ? "approved_request" : "rejected_request",
                Message = $"Vakantie-aanvraag van {request.User?.FirstName} {request.User?.LastName} {actionText}",
                Details = $"Periode: {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy}, Uren: {request.Hours}" +
                         (status == "rejected" && !string.IsNullOrEmpty(processingNotes) ? $", Reden: {processingNotes}" : "")
            };

            _context.Activities.Add(activityForRequester);
            _context.Activities.Add(activityForProcessor);
            _context.Entry(request).State = EntityState.Modified;
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { 
                success = true,
                message = $"Vakantie-aanvraag {actionText}", 
                newStatus = status,
                hoursAffected = request.Hours,
                userId = request.UserId,
                processedBy = new
                {
                    id = processingUser.Id,
                    fullName = $"{processingUser.FirstName} {processingUser.LastName}"
                },
                processedDate = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing vacation request {id}: {ex.Message}");
            await transaction.RollbackAsync();
            return BadRequest($"Fout bij verwerken vakantie-aanvraag: {ex.Message}");
        }
    }

    /// <summary>
    /// GET: api/manager/vacation-requests/stats
    /// Manager statistieken voor vakantie-aanvragen
    /// </summary>
    [HttpGet("vacation-requests/stats")]
    public async Task<ActionResult<object>> GetVacationRequestStats()
    {
        try
        {
            var currentYear = DateTime.Now.Year;
            var requests = await _context.VacationRequests
                .Include(v => v.User)
                .Include(v => v.ProcessedByUser)
                .Where(v => v.StartDate.Year == currentYear)
                .ToListAsync();

            var stats = new
            {
                totalRequests = requests.Count,
                pendingRequests = requests.Count(r => r.Status == "pending"),
                approvedRequests = requests.Count(r => r.Status == "approved"),
                rejectedRequests = requests.Count(r => r.Status == "rejected"),
                totalHoursRequested = requests.Sum(r => r.Hours),
                totalHoursApproved = requests.Where(r => r.Status == "approved").Sum(r => r.Hours),
                averageProcessingTime = requests.Where(r => r.ProcessedDate.HasValue)
                    .Select(r => (r.ProcessedDate!.Value - r.RequestDate).TotalDays)
                    .DefaultIfEmpty(0)
                    .Average(),
                topProcessors = requests
                    .Where(r => r.ProcessedByUser != null)
                    .GroupBy(r => new { r.ProcessedBy, r.ProcessedByUser!.FirstName, r.ProcessedByUser.LastName })
                    .Select(g => new
                    {
                        managerId = g.Key.ProcessedBy, // Changed from adminId
                        managerName = $"{g.Key.FirstName} {g.Key.LastName}", // Changed from adminName
                        processedCount = g.Count(),
                        approvedCount = g.Count(r => r.Status == "approved"),
                        rejectedCount = g.Count(r => r.Status == "rejected")
                    })
                    .OrderByDescending(x => x.processedCount)
                    .Take(5)
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
    /// Krijg vakantie balans voor een specifieke gebruiker (manager view)
    /// </summary>
    [HttpGet("vacation-balance/{userId}")]
    public async Task<ActionResult<object>> GetUserVacationBalanceManager(int userId)
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
                    managerIds = user.ManagerIds, // Include multiple managers
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
/// UPDATED: Manager approves vacation request (first step) - moves to "manager_approved" status (TWO-STEP APPROVAL)
/// </summary>
[HttpPut("vacation-requests/{id}/approve")]
public async Task<IActionResult> ApproveVacationRequestAsManager(int id, [FromBody] JsonElement requestBody)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"Manager approving vacation request {id}");

        var request = await _context.VacationRequests
            .Include(vr => vr.User)
            .FirstOrDefaultAsync(vr => vr.Id == id);
        
        if (request == null) 
        {
            return NotFound("Vakantie-aanvraag niet gevonden");
        }

        // VALIDATION: Only pending requests can be approved by managers
        if (request.Status != "pending")
        {
            return BadRequest($"Alleen aanvragen met status 'pending' kunnen door managers worden goedgekeurd. Huidige status: {request.Status}");
        }

        // Extract managerId and notes from request body
        int? managerId = null;
        string? managerNotes = null; // Changed from rejectionNotes

        if (requestBody.TryGetProperty("managerId", out var managerIdProp))
        {
            if (managerIdProp.TryGetInt32(out var managerIdValue))
            {
                managerId = managerIdValue;
            }
        }

        if (requestBody.TryGetProperty("notes", out var notesProp))
        {
            managerNotes = notesProp.GetString(); // Changed from rejectionNotes
        }

        if (!managerId.HasValue)
        {
            return BadRequest("Manager ID is verplicht");
        }

        // REMOVED: No validation for notes during approval - they are optional

        // Verify the manager exists and has permission
        var manager = await _context.Users.FindAsync(managerId.Value);
        if (manager == null || manager.Rank != "manager")
        {
            return BadRequest("Alleen managers kunnen vakantie-aanvragen goedkeuren"); // Changed message
        }

        // Verify this manager can approve this user's request
        var userManagerIds = request.User?.GetManagerIdsList() ?? new List<int>();
        if (!userManagerIds.Contains(manager.Id))
        {
            return BadRequest($"U kunt alleen aanvragen van uw eigen teamleden goedkeuren. User managers: [{string.Join(", ", userManagerIds)}], Your ID: {manager.Id}"); // Changed message
        }

        // Check vacation balance
        var balance = await GetUserVacationBalance(request.UserId);
        var availableAfterApproval = balance.totalHours - balance.usedHours - request.Hours;
        
        if (availableAfterApproval < 0)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Gebruiker heeft onvoldoende vakantie-uren. Beschikbaar: {balance.totalHours - balance.usedHours} uur, Aangevraagd: {request.Hours} uur");
        }

        // UPDATED: Set manager approval data and move to "manager_approved" status
        request.Status = "manager_approved"; // NEW STATUS - not "rejected"!
        request.ManagerApprovedBy = manager.Id;
        request.ManagerApprovedDate = DateTime.Now;
        request.ManagerApprovalNotes = managerNotes; // Optional notes

        // Create activities
        var activityForRequester = new Activity
        {
            UserId = request.UserId,
            Type = "vacation",
            Action = "manager_approved", // NEW ACTION
            Message = $"Vakantie-aanvraag van {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy} is goedgekeurd door manager {manager.FirstName} {manager.LastName}",
            Details = $"Uren: {request.Hours}, Status: Wacht op finale goedkeuring van admin" + 
                     (!string.IsNullOrEmpty(managerNotes) ? $", Manager opmerkingen: {managerNotes}" : "")
        };

        var activityForManager = new Activity
        {
            UserId = managerId.Value,
            Type = "vacation_manager",
            Action = "approved_for_admin", // NEW ACTION
            Message = $"Vakantie-aanvraag van {request.User?.FirstName} {request.User?.LastName} goedgekeurd - doorgestuurd naar admin",
            Details = $"Periode: {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy}, Uren: {request.Hours}" +
                     (!string.IsNullOrEmpty(managerNotes) ? $", Opmerkingen: {managerNotes}" : "")
        };

        _context.Activities.Add(activityForRequester);
        _context.Activities.Add(activityForManager);
        _context.Entry(request).State = EntityState.Modified;
        
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { 
            success = true,
            message = "Vakantie-aanvraag goedgekeurd door manager - doorgestuurd naar admin voor finale goedkeuring", 
            newStatus = "manager_approved",
            approvalStage = "Pending Admin Approval",
            hoursAffected = request.Hours,
            userId = request.UserId,
            managerApprovedBy = new
            {
                id = manager.Id,
                fullName = $"{manager.FirstName} {manager.LastName}"
            },
            managerApprovedDate = DateTime.Now
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error approving vacation request {id} as manager: {ex.Message}");
        await transaction.RollbackAsync();
        return BadRequest($"Fout bij goedkeuren vakantie-aanvraag: {ex.Message}");
    }
}
/// <summary>
/// UPDATED: Manager rejects vacation request (moves back to "rejected" status) - TWO-STEP APPROVAL
/// </summary>
[HttpPut("vacation-requests/{id}/reject")]
public async Task<IActionResult> RejectVacationRequestAsManager(int id, [FromBody] JsonElement requestBody)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"Manager rejecting vacation request {id}");

        var request = await _context.VacationRequests
            .Include(vr => vr.User)
            .FirstOrDefaultAsync(vr => vr.Id == id);
        
        if (request == null) 
        {
            return NotFound("Vakantie-aanvraag niet gevonden");
        }

        // VALIDATION: Only pending requests can be rejected by managers
        if (request.Status != "pending")
        {
            return BadRequest($"Alleen aanvragen met status 'pending' kunnen door managers worden afgekeurd. Huidige status: {request.Status}");
        }

        // Extract managerId and notes from request body
        int? managerId = null;
        string? rejectionNotes = null;

        if (requestBody.TryGetProperty("managerId", out var managerIdProp))
        {
            if (managerIdProp.TryGetInt32(out var managerIdValue))
            {
                managerId = managerIdValue;
            }
        }

        if (requestBody.TryGetProperty("notes", out var notesProp))
        {
            rejectionNotes = notesProp.GetString();
        }

        if (!managerId.HasValue)
        {
            return BadRequest("Manager ID is verplicht");
        }

        if (string.IsNullOrWhiteSpace(rejectionNotes))
        {
            return BadRequest("Reden voor afwijzing is verplicht");
        }

        // Verify the manager exists and has permission
        var manager = await _context.Users.FindAsync(managerId.Value);
        if (manager == null || manager.Rank != "manager")
        {
            return BadRequest("Alleen managers kunnen vakantie-aanvragen afwijzen");
        }

        // Verify this manager can reject this user's request
        var userManagerIds = request.User?.GetManagerIdsList() ?? new List<int>();
        if (!userManagerIds.Contains(manager.Id))
        {
            return BadRequest($"U kunt alleen aanvragen van uw eigen teamleden afwijzen. User managers: [{string.Join(", ", userManagerIds)}], Your ID: {manager.Id}");
        }

        // Update request to rejected status
        request.Status = "rejected";
        request.ProcessedBy = manager.Id;
        request.ProcessedDate = DateTime.Now;
        request.ProcessingNotes = rejectionNotes;

        // Create activities
        var activityForRequester = new Activity
        {
            UserId = request.UserId,
            Type = "vacation",
            Action = "rejected",
            Message = $"Vakantie-aanvraag van {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy} is afgekeurd door manager {manager.FirstName} {manager.LastName}",
            Details = $"Uren: {request.Hours}, Reden: {rejectionNotes}"
        };

        var activityForManager = new Activity
        {
            UserId = managerId.Value,
            Type = "vacation_manager",
            Action = "rejected_request",
            Message = $"Vakantie-aanvraag van {request.User?.FirstName} {request.User?.LastName} afgekeurd",
            Details = $"Periode: {request.StartDate:dd-MM-yyyy} tot {request.EndDate:dd-MM-yyyy}, Uren: {request.Hours}, Reden: {rejectionNotes}"
        };

        _context.Activities.Add(activityForRequester);
        _context.Activities.Add(activityForManager);
        _context.Entry(request).State = EntityState.Modified;
        
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { 
            success = true,
            message = "Vakantie-aanvraag afgekeurd door manager", 
            newStatus = "rejected",
            hoursAffected = request.Hours,
            userId = request.UserId,
            rejectedBy = new
            {
                id = manager.Id,
                fullName = $"{manager.FirstName} {manager.LastName}"
            },
            rejectedDate = DateTime.Now,
            rejectionReason = rejectionNotes
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error rejecting vacation request {id} as manager: {ex.Message}");
        await transaction.RollbackAsync();
        return BadRequest($"Fout bij afwijzen vakantie-aanvraag: {ex.Message}");
    }
}
    /// <summary>
    /// FIXED: Get vacation overview for team members only (manager view) - now supports multiple managers
    /// </summary>
    [HttpGet("vacation-overview/team/{managerId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetTeamVacationOverview(int managerId)
    {
        try
        {
            // Verify manager exists
            var manager = await _context.Users.FindAsync(managerId);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Ongeldige manager");
            }

            // FIXED: Get all users and filter for this manager's team using multiple managers support
            var allUsers = await _context.Users.ToListAsync();
            var teamMembers = allUsers
                .Where(u => u.GetManagerIdsList().Contains(managerId))
                .ToList();

            Console.WriteLine($"Manager {managerId} has {teamMembers.Count} team members: {string.Join(", ", teamMembers.Select(u => $"{u.FirstName} {u.LastName} (ID: {u.Id})"))}");
                
            var overview = new List<object>();

            foreach (var user in teamMembers)
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
                        function = user.Function,
                        managerIds = user.ManagerIds // Include multiple managers info
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
            Console.WriteLine($"Error getting team vacation overview: {ex.Message}");
            return BadRequest($"Fout bij ophalen team vakantie overzicht: {ex.Message}");
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
/// DTO for processing requests
/// </summary>
public class ProcessTimeEntryDto
{
    public string? Notes { get; set; }
}

/// <summary>
/// DTO voor het aanmaken van projecten
/// </summary>
public class ProjectDto
{
    public string Name { get; set; }
    public int ProjectGroupId { get; set; }
}

// DTOs for manager actions
public class ApproveTimeEntryDto
{
    public int? ManagerId { get; set; }
    public string? Notes { get; set; }
}

public class RejectTimeEntryDto
{
    public int? ManagerId { get; set; }
    public string? Notes { get; set; }
}