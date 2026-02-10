using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller for manually triggering email reminders (admin only)
/// </summary>
[ApiController]
[Route("api/reminders")]
public class RemindersController : ControllerBase
{
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
        try
        {
            // Check if user is manager
            var userRole = HttpContext.Request.Headers["X-USER-ROLE"].FirstOrDefault();
            if (userRole?.ToLower() != "manager")
            {
                return StatusCode(403, new { error = "Only managers can trigger reminders" });
            }

            _logger.LogInformation("Manual employee reminder triggered");
            await _emailService.SendEmployeeReminderAsync();
            return Ok(new { success = true, message = "Employee reminder emails sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering employee reminder");
            return StatusCode(500, new { error = "Failed to send reminders", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/reminders/manager
    /// Manually trigger manager overview emails
    /// </summary>
    [HttpPost("manager")]
    public async Task<ActionResult> TriggerManagerOverview()
    {
        try
        {
            // Check if user is manager
            var userRole = HttpContext.Request.Headers["X-USER-ROLE"].FirstOrDefault();
            if (userRole?.ToLower() != "manager")
            {
                return StatusCode(403, new { error = "Only managers can trigger reminders" });
            }

            _logger.LogInformation("Manual manager overview triggered");
            await _emailService.SendManagerOverviewAsync();
            return Ok(new { success = true, message = "Manager overview emails sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering manager overview");
            return StatusCode(500, new { error = "Failed to send overview", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/reminders/status
    /// Get current reminder schedule status
    /// </summary>
    [HttpGet("status")]
    public ActionResult GetStatus()
    {
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
                    nextRun = nextTuesday.AddHours(10).ToString("yyyy-MM-dd HH:mm")
                },
                managerOverview = new
                {
                    day = "Tuesday",
                    time = "12:00",
                    nextRun = nextTuesday.AddHours(12).ToString("yyyy-MM-dd HH:mm")
                }
            }
        });
    }
}
