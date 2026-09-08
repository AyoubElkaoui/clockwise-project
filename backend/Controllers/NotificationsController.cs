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
            var userId = this.CurrentUserId();
            if (userId == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
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

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notifications for user {UserId}", userId);
                return StatusCode(500, new { error = "Fout bij ophalen notificaties" });
            }
        }

        // GET: api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var userId = this.CurrentUserId();
            if (userId == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
                var count = await _notificationRepository.GetUnreadCountAsync(userId.Value);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching unread count for user {UserId}", userId);
                return StatusCode(500, new { error = "Fout bij ophalen aantal ongelezen notificaties" });
            }
        }

        // NB: POST api/notifications (aanmaken voor willekeurige gebruiker) is verwijderd;
        // notificaties worden uitsluitend server-side aangemaakt en de frontend gebruikte dit endpoint niet.

        // PUT: api/notifications/{id}/read
        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = this.CurrentUserId();
            if (userId == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
                // Repository filtert op user_id: alleen eigen notificaties kunnen gemarkeerd worden.
                var success = await _notificationRepository.MarkAsReadAsync(id, userId.Value);
                if (!success)
                    return NotFound(new { error = "Notificatie niet gevonden" });

                return Ok(new { message = "Notificatie gemarkeerd als gelezen" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification {Id} as read", id);
                return StatusCode(500, new { error = "Fout bij markeren als gelezen" });
            }
        }

        // PUT/POST: api/notifications/read-all (alias: mark-all-read, zoals de frontend aanroept)
        [HttpPut("read-all")]
        [HttpPut("mark-all-read")]
        [HttpPost("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = this.CurrentUserId();
            if (userId == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
                await _notificationRepository.MarkAllAsReadAsync(userId.Value);
                return Ok(new { message = "Alle notificaties gemarkeerd als gelezen" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
                return StatusCode(500, new { error = "Fout bij markeren als gelezen" });
            }
        }

        // DELETE: api/notifications/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = this.CurrentUserId();
            if (userId == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
                var success = await _notificationRepository.DeleteAsync(id, userId.Value);
                if (!success)
                    return NotFound(new { error = "Notificatie niet gevonden" });

                return Ok(new { message = "Notificatie verwijderd" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification {Id}", id);
                return StatusCode(500, new { error = "Fout bij verwijderen notificatie" });
            }
        }
    }
}
