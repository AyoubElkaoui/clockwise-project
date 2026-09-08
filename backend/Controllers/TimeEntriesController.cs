using Microsoft.AspNetCore.Mvc;
using backend.Controllers;
using backend.Repositories;

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

        // GET: api/time-entries?from=&to=[&userId=]  (userId alleen voor manager/admin)
        [HttpGet]
        public async Task<IActionResult> GetTimeEntries([FromQuery] string? from, [FromQuery] string? to, [FromQuery] int? userId = null)
        {
            if (!DateTime.TryParse(from, out var fromDate) || !DateTime.TryParse(to, out var toDate))
                return BadRequest(new { error = "Ongeldig datumformaat" });

            // Clamp to prevent future ranges from causing DB errors
            var today = DateTime.UtcNow.Date;
            if (toDate.Date > today) toDate = today;
            if (fromDate.Date > toDate.Date) fromDate = toDate.Date;

            var target = ResolveTargetMedewGcId(userId, out var forbidden);
            if (forbidden != null) return forbidden;
            if (!target.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            try
            {
                var entries = await _timeEntryRepository.GetAllTimeEntriesAsync(fromDate, toDate);
                var userEntries = entries.Where(e => e.UserId == target.Value).ToList();
                return Ok(userEntries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch time entries for medew {MedewGcId} from {From} to {To}", target, fromDate, toDate);
                return StatusCode(500, new { error = "Fout bij ophalen urenregistraties" });
            }
        }

        // GET: api/time-entries/user/{userId}/week?startDate=
        [HttpGet("user/{userId:int}/week")]
        public async Task<IActionResult> GetWeekEntries(int userId, [FromQuery] string? startDate)
        {
            if (!DateTime.TryParse(startDate, out var start))
                return BadRequest(new { error = "Ongeldige startdatum" });

            var end = start.AddDays(6);

            var target = ResolveTargetMedewGcId(userId, out var forbidden);
            if (forbidden != null) return forbidden;
            if (!target.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            try
            {
                var entries = await _timeEntryRepository.GetAllTimeEntriesAsync(start, end);
                var userEntries = entries.Where(e => e.UserId == target.Value).ToList();
                return Ok(new { entries = userEntries });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch week entries for medew {MedewGcId}", target);
                return StatusCode(500, new { error = "Fout bij ophalen weekregistraties" });
            }
        }

        /// <summary>
        /// Bepaalt op welke medewerker gefilterd wordt. Een afwijkende userId is alleen toegestaan
        /// voor managers/beheerders; in dat geval wordt écht op die userId gefilterd.
        /// </summary>
        private int? ResolveTargetMedewGcId(int? requestedUserId, out IActionResult? forbidden)
        {
            forbidden = null;
            var current = this.CurrentMedewGcId();

            if (!requestedUserId.HasValue || (current.HasValue && requestedUserId.Value == current.Value))
                return current;

            if (!this.IsManagerOrAdmin())
            {
                forbidden = StatusCode(403, new { error = "Je mag alleen je eigen urenregistraties bekijken" });
                return null;
            }

            return requestedUserId.Value;
        }
    }
}
