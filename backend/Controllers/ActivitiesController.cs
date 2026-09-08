using backend.Controllers;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/activities")]
    public class ActivitiesController : ControllerBase
    {
        private readonly ActivityService _activityService;
        private readonly ILogger<ActivitiesController> _logger;

        public ActivitiesController(ActivityService activityService, ILogger<ActivitiesController> logger)
        {
            _activityService = activityService;
            _logger = logger;
        }

        // GET: api/activities?limit=20[&userId=]
        // userId wordt alleen gehonoreerd voor managers/beheerders; anders altijd de aanroeper zelf.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Activity>>> GetActivities([FromQuery] int limit = 20, [FromQuery] int? userId = null)
        {
            var resolvedUserId = ResolveTargetUserId(userId);
            if (!resolvedUserId.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            if (limit < 1 || limit > 500) limit = 20;

            try
            {
                var activities = await _activityService.GetActivitiesAsync(resolvedUserId.Value, limit);
                return Ok(activities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching activities for {UserId}", resolvedUserId);
                return StatusCode(500, new { error = "Fout bij ophalen activiteiten" });
            }
        }

        // GET: api/activities/{userId}
        [HttpGet("{userId:int}")]
        public async Task<ActionResult<IEnumerable<Activity>>> GetActivitiesByUserId(int userId, [FromQuery] int limit = 100)
        {
            var current = this.CurrentMedewGcId();
            if (!current.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            if (userId != current.Value && !this.IsManagerOrAdmin())
                return StatusCode(403, new { error = "Je mag alleen je eigen activiteiten bekijken" });

            if (limit < 1 || limit > 500) limit = 100;

            try
            {
                var activities = await _activityService.GetActivitiesAsync(userId, limit);
                return Ok(activities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching activities for {UserId}", userId);
                return StatusCode(500, new { error = "Fout bij ophalen activiteiten" });
            }
        }

        // POST: api/activities/{activityId}/read
        [HttpPost("{activityId:int}/read")]
        public async Task<IActionResult> MarkAsReadPost(int activityId)
        {
            var result = await MarkAsReadForCurrentUser(activityId);
            return result ?? Ok(new { success = true });
        }

        // PUT: api/activities/{activityId}/read
        [HttpPut("{activityId:int}/read")]
        public async Task<IActionResult> MarkAsRead(int activityId)
        {
            var result = await MarkAsReadForCurrentUser(activityId);
            return result ?? NoContent();
        }

        // PUT: api/activities/read-all  (userId-queryparam wordt genegeerd: altijd de aanroeper)
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var current = this.CurrentMedewGcId();
            if (!current.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            try
            {
                await _activityService.MarkAllAsReadAsync(current.Value);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all activities as read for {UserId}", current);
                return StatusCode(500, new { error = "Fout bij markeren als gelezen" });
            }
        }

        /// <summary>
        /// Markeert een activiteit als gelezen, uitsluitend als deze aan de aanroeper toebehoort.
        /// Geeft null terug bij succes, anders het foutresultaat.
        /// </summary>
        private async Task<IActionResult?> MarkAsReadForCurrentUser(int activityId)
        {
            var current = this.CurrentMedewGcId();
            if (!current.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            try
            {
                var own = await _activityService.GetActivitiesAsync(current.Value, 500);
                if (!own.Any(a => a.Id == activityId))
                    return StatusCode(403, new { error = "Deze activiteit behoort niet aan jou toe" });

                await _activityService.MarkAsReadAsync(activityId);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking activity {ActivityId} as read", activityId);
                return StatusCode(500, new { error = "Fout bij markeren als gelezen" });
            }
        }

        private int? ResolveTargetUserId(int? requestedUserId)
        {
            var current = this.CurrentMedewGcId();
            if (requestedUserId.HasValue && this.IsManagerOrAdmin())
                return requestedUserId.Value;
            return current;
        }
    }
}
