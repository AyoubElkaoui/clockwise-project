using Microsoft.AspNetCore.Mvc;
using backend.Repositories;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/time-entries")]
    public class TimeEntriesController : ControllerBase
    {
        private readonly DapperTimeEntryRepository _timeEntryRepository;
        private readonly ILogger<TimeEntriesController> _logger;

        public TimeEntriesController(DapperTimeEntryRepository timeEntryRepository, ILogger<TimeEntriesController> logger)
        {
            _timeEntryRepository = timeEntryRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetTimeEntries([FromQuery] string from, [FromQuery] string to, [FromQuery] int? userId = null)
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
                _logger.LogWarning("No medewGcId resolved for userId {UserId}", userId);
                return Unauthorized("Missing medewGcId");
            }

            _logger.LogInformation("Fetching time entries for medewGcId {MedewGcId} from {From} to {To}", medewGcId.Value, fromDate, toDate);

            try
            {
                var entries = await _timeEntryRepository.GetAllTimeEntriesAsync(fromDate, toDate);

                // Filter by medewGcId
                var userEntries = entries.Where(e => e.UserId == medewGcId.Value).ToList();

                _logger.LogInformation("Found {Count} time entries for medewGcId {MedewGcId}", userEntries.Count, medewGcId.Value);

                // Return array directly for user endpoints (frontend expects response.data to be array)
                return Ok(userEntries);
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
        public async Task<IActionResult> GetWeekEntries(int userId, [FromQuery] string startDate)
        {
            if (!DateTime.TryParse(startDate, out var start))
                return BadRequest("Invalid start date");

            var end = start.AddDays(6);

            var medewGcId = ResolveMedewGcId(userId);
            if (!medewGcId.HasValue)
            {
                return Unauthorized("Missing medewGcId");
            }

            _logger.LogInformation("Fetching week entries for medewGcId {MedewGcId} from {Start} to {End}", medewGcId.Value, start, end);

            try
            {
                var entries = await _timeEntryRepository.GetAllTimeEntriesAsync(start, end);

                // Filter by medewGcId
                var userEntries = entries.Where(e => e.UserId == medewGcId.Value).ToList();

                // Return object with entries for week endpoint
                return Ok(new
                {
                    entries = userEntries
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch week entries for user {UserId}", userId);
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("work")]
        public async Task<IActionResult> PostWorkEntries([FromBody] object dto)
        {
            _logger.LogInformation("PostWorkEntries called - not yet implemented with Dapper");
            return StatusCode(501, new { message = "Work entry creation not yet implemented" });
        }

        [HttpPost("vacation")]
        public async Task<IActionResult> PostVacationEntries([FromBody] object dto)
        {
            _logger.LogInformation("PostVacationEntries called - not yet implemented with Dapper");
            return StatusCode(501, new { message = "Vacation entry creation not yet implemented" });
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
