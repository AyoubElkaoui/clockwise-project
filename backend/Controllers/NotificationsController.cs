using backend.Models;
using backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            INotificationRepository notificationRepository,
            ILogger<NotificationsController> logger)
        {
            _notificationRepository = notificationRepository;
            _logger = logger;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationResponse>>> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                _logger.LogWarning("Unauthorized notification access attempt");
                return Unauthorized(new { message = "User not authenticated" });
            }

            _logger.LogInformation("Fetching notifications for userId: {UserId}, unreadOnly: {UnreadOnly}", userId, unreadOnly);

            var notifications = await _notificationRepository.GetByUserIdAsync(userId.Value, unreadOnly);

            var response = notifications.Select(n => new NotificationResponse
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                RelatedEntityType = n.RelatedEntityType,
                RelatedEntityId = n.RelatedEntityId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            });

            _logger.LogInformation("Returning {Count} notifications for userId: {UserId}", response.Count(), userId);

            return Ok(response);
        }

        // GET: api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            var count = await _notificationRepository.GetUnreadCountAsync(userId.Value);
            return Ok(new { count });
        }

        // POST: api/notifications
        [HttpPost]
        public async Task<ActionResult<NotificationResponse>> CreateNotification([FromBody] CreateNotificationDto notification)
        {
            var id = await _notificationRepository.CreateAsync(notification);
            
            if (id == 0)
                return StatusCode(500, new { message = "Failed to create notification" });

            var created = await _notificationRepository.GetByIdAsync(id);
            
            if (created == null)
                return StatusCode(500, new { message = "Failed to retrieve created notification" });

            return CreatedAtAction(nameof(GetNotifications), new { id }, new NotificationResponse
            {
                Id = created.Id,
                Type = created.Type,
                Title = created.Title,
                Message = created.Message,
                RelatedEntityType = created.RelatedEntityType,
                RelatedEntityId = created.RelatedEntityId,
                IsRead = created.IsRead,
                CreatedAt = created.CreatedAt
            });
        }

        // PUT: api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            var success = await _notificationRepository.MarkAsReadAsync(id, userId.Value);
            
            if (!success)
                return NotFound(new { message = "Notification not found" });

            return Ok(new { message = "Notification marked as read" });
        }

        // PUT: api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            await _notificationRepository.MarkAllAsReadAsync(userId.Value);
            return Ok(new { message = "All notifications marked as read" });
        }

        // DELETE: api/notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            var success = await _notificationRepository.DeleteAsync(id, userId.Value);
            
            if (!success)
                return NotFound(new { message = "Notification not found" });

            return Ok(new { message = "Notification deleted" });
        }

        private int? GetCurrentUserId()
        {
            if (HttpContext.Items.TryGetValue("UserId", out var userId))
                return userId as int?;
            
            if (HttpContext.Request.Headers.TryGetValue("X-USER-ID", out var header) &&
                int.TryParse(header, out var id))
                return id;

            return null;
        }
    }
}
