using backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ManagerController : ControllerBase
{
    private readonly DapperTimeEntryRepository _timeEntryRepo;
    private readonly ILogger<ManagerController> _logger;

    public ManagerController(
        DapperTimeEntryRepository timeEntryRepo,
        ILogger<ManagerController> logger)
    {
        _timeEntryRepo = timeEntryRepo;
        _logger = logger;
    }

    [HttpGet("dashboard/stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            var stats = await _timeEntryRepo.GetStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching dashboard stats");
            return StatusCode(500, new { message = "Error fetching dashboard stats" });
        }
    }

    [HttpGet("time-entries")]
    public async Task<IActionResult> GetAllTimeEntries([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        try
        {
            var entries = await _timeEntryRepo.GetAllTimeEntriesAsync(from, to);
            return Ok(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entries");
            return StatusCode(500, new { message = "Error fetching time entries" });
        }
    }

    [HttpGet("time-entries/pending")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        try
        {
            var entries = await _timeEntryRepo.GetPendingApprovalsAsync();
            return Ok(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending approvals");
            return StatusCode(500, new { message = "Error fetching pending approvals" });
        }
    }

    [HttpPut("time-entries/{id}/approve")]
    public async Task<IActionResult> ApproveTimeEntry(int id, [FromBody] ApprovalRequest request)
    {
        try
        {
            var success = await _timeEntryRepo.ApproveTimeEntryAsync(id, request.Approved);

            if (!success)
            {
                return NotFound(new { message = "Time entry not found" });
            }

            return Ok(new { message = request.Approved ? "Time entry approved" : "Time entry rejected" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving time entry {Id}", id);
            return StatusCode(500, new { message = "Error processing approval" });
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            // Get manager's medew_gc_id from header
            if (!Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var medewGcIdHeader))
            {
                return Unauthorized(new { message = "Manager ID not provided" });
            }

            if (!int.TryParse(medewGcIdHeader, out int managerMedewGcId))
            {
                return BadRequest(new { message = "Invalid manager ID" });
            }

            var users = await _timeEntryRepo.GetTeamMembersForManagerAsync(managerMedewGcId);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users");
            return StatusCode(500, new { message = "Error fetching users" });
        }
    }
}

public class ApprovalRequest
{
    public bool Approved { get; set; }
}
