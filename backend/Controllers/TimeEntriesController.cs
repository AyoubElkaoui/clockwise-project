using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Models;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/time-entries")]
    public class TimeEntriesController : ControllerBase
    {
        private readonly TimeEntryService _timeEntryService;
        private readonly ILogger<TimeEntriesController> _logger;

        public TimeEntriesController(TimeEntryService timeEntryService, ILogger<TimeEntriesController> logger)
        {
            _timeEntryService = timeEntryService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<TimeEntriesResponse>> GetTimeEntries([FromQuery] string from, [FromQuery] string to, [FromQuery] int? userId = null)
        {
            if (!DateTime.TryParse(from, out var fromDate) || !DateTime.TryParse(to, out var toDate))
                return BadRequest("Invalid date format");

            // Clamp to prevent future ranges from causing DB errors
            var today = DateTime.UtcNow.Date;
            if (toDate.Date > today) toDate = today;
            if (fromDate.Date > toDate.Date) fromDate = toDate.Date;

            var medewGcId = ResolveMedewGcId(userId);
            if (!medewGcId.HasValue)
            {
                return Unauthorized("Missing medewGcId");
            }

            try
            {
                var response = await _timeEntryService.GetTimeEntriesAsync(medewGcId.Value, fromDate, toDate);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch time entries for medew {MedewGcId} from {From} to {To}", medewGcId, fromDate, toDate);
                return StatusCode(500, new
                {
                    message = "Failed to fetch time entries",
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        [HttpGet("user/{userId}/week")]
        public async Task<ActionResult<TimeEntriesResponse>> GetWeekEntries(int userId, [FromQuery] string startDate)
        {
            if (!DateTime.TryParse(startDate, out var start))
                return BadRequest("Invalid start date");

            var end = start.AddDays(6);

            var medewGcId = ResolveMedewGcId(userId);
            if (!medewGcId.HasValue)
            {
                return Unauthorized("Missing medewGcId");
            }

            try
            {
                var response = await _timeEntryService.GetTimeEntriesAsync(medewGcId.Value, start, end);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch week entries for user {UserId}", userId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("work")]
        public async Task<IActionResult> PostWorkEntries([FromBody] BulkWorkEntryDto dto)
        {
            if (dto == null || dto.Regels == null || !dto.Regels.Any())
                return BadRequest("Invalid input");

            var medewGcId = (int)HttpContext.Items["MedewGcId"]!;
            try
            {
                await _timeEntryService.InsertWorkEntriesAsync(medewGcId, dto);
                return Ok("Work entries inserted successfully");
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(422, new ProblemDetails { Title = "Urenstaat ontbreekt", Detail = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inserting work entries");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("vacation")]
        public async Task<IActionResult> PostVacationEntries([FromBody] BulkVacationEntryDto dto)
        {
            if (dto == null || dto.Regels == null || !dto.Regels.Any())
                return BadRequest("Invalid input");

            var medewGcId = (int)HttpContext.Items["MedewGcId"]!;
            try
            {
                await _timeEntryService.InsertVacationEntriesAsync(medewGcId, dto);
                return Ok("Vacation entries inserted successfully");
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(422, new ProblemDetails { Title = "Urenstaat ontbreekt", Detail = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error");
            }
        }

        private int? ResolveMedewGcId(int? userId)
        {
            if (HttpContext.Items.TryGetValue("MedewGcId", out var medewObj) && medewObj is int medewFromContext)
                return medewFromContext;

            if (userId.HasValue)
                return userId.Value;

            if (Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var header) &&
                int.TryParse(header, out var medewFromHeader))
            {
                return medewFromHeader;
            }

            return null;
        }
    }
}
