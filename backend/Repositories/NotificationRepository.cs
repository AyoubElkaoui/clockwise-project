using backend.Models;
using Dapper;
using Npgsql;

namespace backend.Repositories
{
    public interface INotificationRepository
    {
        Task<IEnumerable<Notification>> GetByUserIdAsync(int userId, bool unreadOnly = false);
        Task<int> GetUnreadCountAsync(int userId);
        Task<Notification?> GetByIdAsync(int id);
        Task<int> CreateAsync(CreateNotificationDto notification);
        Task<bool> MarkAsReadAsync(int id, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<bool> DeleteAsync(int id, int userId);
    }

    public class NotificationRepository : INotificationRepository
    {
        private readonly string _connectionString;
        private readonly ILogger<NotificationRepository> _logger;

        public NotificationRepository(IConfiguration configuration, ILogger<NotificationRepository> logger)
        {
            _connectionString = configuration.GetConnectionString("PostgreSQL") 
                ?? throw new InvalidOperationException("PostgreSQL connection string not found");
            _logger = logger;
        }

        public async Task<IEnumerable<Notification>> GetByUserIdAsync(int userId, bool unreadOnly = false)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var sql = @"
                SELECT id, user_id as UserId, type, title, message, 
                       related_entity_type as RelatedEntityType, 
                       related_entity_id as RelatedEntityId, 
                       is_read as IsRead, created_at as CreatedAt, read_at as ReadAt
                FROM notifications 
                WHERE user_id = @UserId";

            if (unreadOnly)
            {
                sql += " AND is_read = false";
            }

            sql += " ORDER BY created_at DESC LIMIT 50";

            try
            {
                var notifications = await connection.QueryAsync<Notification>(sql, new { UserId = userId });
                return notifications;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notifications for user {UserId}", userId);
                return Enumerable.Empty<Notification>();
            }
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var count = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM notifications WHERE user_id = @UserId AND is_read = false",
                    new { UserId = userId });
                return count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count for user {UserId}", userId);
                return 0;
            }
        }

        public async Task<Notification?> GetByIdAsync(int id)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var notification = await connection.QueryFirstOrDefaultAsync<Notification>(
                    @"SELECT id, user_id as UserId, type, title, message, 
                             related_entity_type as RelatedEntityType, 
                             related_entity_id as RelatedEntityId, 
                             is_read as IsRead, created_at as CreatedAt, read_at as ReadAt
                      FROM notifications WHERE id = @Id",
                    new { Id = id });
                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching notification {Id}", id);
                return null;
            }
        }

        public async Task<int> CreateAsync(CreateNotificationDto notification)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var id = await connection.ExecuteScalarAsync<int>(
                    @"INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
                      VALUES (@UserId, @Type, @Title, @Message, @RelatedEntityType, @RelatedEntityId)
                      RETURNING id",
                    notification);

                _logger.LogInformation("Created notification {Id} for user {UserId}", id, notification.UserId);
                return id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification for user {UserId}", notification.UserId);
                return 0;
            }
        }

        public async Task<bool> MarkAsReadAsync(int id, int userId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var rowsAffected = await connection.ExecuteAsync(
                    @"UPDATE notifications 
                      SET is_read = true, read_at = NOW() 
                      WHERE id = @Id AND user_id = @UserId",
                    new { Id = id, UserId = userId });

                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification {Id} as read", id);
                return false;
            }
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var rowsAffected = await connection.ExecuteAsync(
                    @"UPDATE notifications 
                      SET is_read = true, read_at = NOW() 
                      WHERE user_id = @UserId AND is_read = false",
                    new { UserId = userId });

                _logger.LogInformation("Marked {Count} notifications as read for user {UserId}", rowsAffected, userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
                return false;
            }
        }

        public async Task<bool> DeleteAsync(int id, int userId)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            try
            {
                var rowsAffected = await connection.ExecuteAsync(
                    "DELETE FROM notifications WHERE id = @Id AND user_id = @UserId",
                    new { Id = id, UserId = userId });

                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification {Id}", id);
                return false;
            }
        }
    }
}
