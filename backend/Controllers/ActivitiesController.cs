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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Activity>>> GetActivities([FromQuery] int limit = 20, [FromQuery] int? userId = null)
        {
            var resolvedUserId = ResolveUserId(userId);
            var activities = await _activityService.GetActivitiesAsync(resolvedUserId, limit);
            return Ok(activities);
        }

        // GET: api/activities/{userId}
        [HttpGet("{userId}")]
        public async Task<ActionResult<IEnumerable<Activity>>> GetActivitiesByUserId(int userId, [FromQuery] int limit = 100)
        {
            var activities = await _activityService.GetActivitiesAsync(userId, limit);
            return Ok(activities);
        }

        // POST: api/activities/{activityId}/read
        [HttpPost("{activityId}/read")]
        public async Task<IActionResult> MarkAsReadPost(int activityId)
        {
            await _activityService.MarkAsReadAsync(activityId);
            return Ok(new { success = true });
        }

        [HttpPut("{activityId}/read")]
        public async Task<IActionResult> MarkAsRead(int activityId)
        {
            await _activityService.MarkAsReadAsync(activityId);
            return NoContent();
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead([FromQuery] int? userId = null)
        {
            var resolvedUserId = ResolveUserId(userId);
            if (!resolvedUserId.HasValue)
            {
                return BadRequest("userId is required");
            }

            await _activityService.MarkAllAsReadAsync(resolvedUserId.Value);
            return NoContent();
        }

        private int? ResolveUserId(int? userId)
        {
            if (userId.HasValue) return userId.Value;

            if (HttpContext.Items.TryGetValue("MedewGcId", out var medewId) && medewId is int parsed)
            {
                return parsed;
            }

            // Try header as last resort
            if (HttpContext.Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var header) &&
                int.TryParse(header, out var headerValue))
            {
                return headerValue;
            }

            _logger.LogWarning("No user identifier found for activities request");
            return null;
        }
    }
}
