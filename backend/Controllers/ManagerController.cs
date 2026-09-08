using backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ManagerController : ControllerBase
{
    private const string ForbiddenMessage = "Alleen managers of beheerders hebben toegang tot dit onderdeel";

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
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        try
        {
            var stats = await _timeEntryRepo.GetStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching dashboard stats");
            return StatusCode(500, new { error = "Fout bij ophalen dashboardstatistieken" });
        }
    }

    [HttpGet("time-entries")]
    public async Task<IActionResult> GetAllTimeEntries([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        try
        {
            var entries = await _timeEntryRepo.GetAllTimeEntriesAsync(from, to);
            return Ok(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entries");
            return StatusCode(500, new { error = "Fout bij ophalen urenregistraties" });
        }
    }

    [HttpGet("time-entries/pending")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        try
        {
            var entries = await _timeEntryRepo.GetPendingApprovalsAsync();
            return Ok(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending approvals");
            return StatusCode(500, new { error = "Fout bij ophalen openstaande goedkeuringen" });
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        var managerMedewGcId = this.CurrentMedewGcId();
        if (managerMedewGcId == null)
            return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

        try
        {
            var users = await _timeEntryRepo.GetTeamMembersForManagerAsync(managerMedewGcId.Value);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users for manager {MedewGcId}", managerMedewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen gebruikers" });
        }
    }
}
