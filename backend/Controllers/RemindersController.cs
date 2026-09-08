using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller for manually triggering email reminders (manager/admin only)
/// </summary>
[ApiController]
[Route("api/reminders")]
public class RemindersController : ControllerBase
{
    private const string ForbiddenMessage = "Alleen managers of beheerders mogen herinneringen versturen";

    private readonly IEmailReminderService _emailService;
    private readonly ILogger<RemindersController> _logger;

    public RemindersController(
        IEmailReminderService emailService,
        ILogger<RemindersController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/reminders/employee
    /// Manually trigger employee reminder emails
    /// </summary>
    [HttpPost("employee")]
    public async Task<ActionResult> TriggerEmployeeReminder()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        try
        {
            _logger.LogInformation("Manual employee reminder triggered by user {UserId}", this.CurrentUserId());
            await _emailService.SendEmployeeReminderAsync();
            return Ok(new { success = true, message = "Herinneringsmails naar medewerkers verstuurd" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering employee reminder");
            return StatusCode(500, new { error = "Versturen van herinneringen mislukt" });
        }
    }

    /// <summary>
    /// POST /api/reminders/manager
    /// Manually trigger manager overview emails
    /// </summary>
    [HttpPost("manager")]
    public async Task<ActionResult> TriggerManagerOverview()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        try
        {
            _logger.LogInformation("Manual manager overview triggered by user {UserId}", this.CurrentUserId());
            await _emailService.SendManagerOverviewAsync();
            return Ok(new { success = true, message = "Overzichtsmails naar managers verstuurd" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering manager overview");
            return StatusCode(500, new { error = "Versturen van overzicht mislukt" });
        }
    }

    /// <summary>
    /// GET /api/reminders/status
    /// Get current reminder schedule status
    /// </summary>
    [HttpGet("status")]
    public ActionResult GetStatus()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ForbiddenMessage });

        var now = DateTime.Now;
        var nextTuesday = now.AddDays((7 - (int)now.DayOfWeek + (int)DayOfWeek.Tuesday) % 7);
        if (now.DayOfWeek == DayOfWeek.Tuesday && now.Hour < 12)
        {
            nextTuesday = now.Date;
        }

        return Ok(new
        {
            currentTime = now.ToString("yyyy-MM-dd HH:mm:ss"),
            currentDay = now.DayOfWeek.ToString(),
            schedule = new
            {
                employeeReminder = new
                {
                    day = "Tuesday",
                    time = "10:00",
                    nextRun = nextTuesday.Date.AddHours(10).ToString("yyyy-MM-dd HH:mm")
                },
                managerOverview = new
                {
                    day = "Tuesday",
                    time = "12:00",
                    nextRun = nextTuesday.Date.AddHours(12).ToString("yyyy-MM-dd HH:mm")
                }
            }
        });
    }
}
