using Dapper;
using ClockwiseProject.Backend.Data;

namespace backend.Repositories;

public class PostgreSQLUserRepository
{
    private readonly PostgreSQLConnectionFactory _connectionFactory;
    private readonly ILogger<PostgreSQLUserRepository> _logger;

    private const string TwoFAColumns = @"
        id AS Id, email AS Email,
        two_factor_enabled AS TwoFactorEnabled,
        two_factor_method AS TwoFactorMethod,
        two_factor_secret AS TwoFactorSecret,
        two_factor_email_code AS TwoFactorEmailCode,
        two_factor_code_expires_at AS TwoFactorCodeExpiresAt,
        two_factor_backup_codes AS TwoFactorBackupCodes";

    public PostgreSQLUserRepository(
        PostgreSQLConnectionFactory connectionFactory,
        ILogger<PostgreSQLUserRepository> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<PostgresUser?> GetByUsernameAsync(string username)
    {
        const string sql = @"
            SELECT
                id AS Id,
                medew_gc_id AS MedewGcId,
                username AS Username,
                password_hash AS PasswordHash,
                email AS Email,
                role AS Role,
                first_name AS FirstName,
                last_name AS LastName,
                phone AS Phone,
                is_active AS IsActive,
                last_login AS LastLogin,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt,
                allowed_tasks AS AllowedTasks
            FROM users
            WHERE username = @username AND is_active = TRUE";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<PostgresUser>(sql, new { username });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user by username: {Username}", username);
            throw;
        }
    }

    public async Task<PostgresUser?> GetByIdAsync(int id)
    {
        const string sql = @"
            SELECT
                id, medew_gc_id, username, password_hash, email,
                role, first_name, last_name, phone, is_active,
                last_login, created_at, updated_at, allowed_tasks
            FROM users
            WHERE id = @id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<PostgresUser>(sql, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user by ID: {Id}", id);
            throw;
        }
    }

    public async Task<PostgresUser?> GetByMedewGcIdAsync(int medewGcId)
    {
        const string sql = @"
            SELECT
                id, medew_gc_id, username, password_hash, email,
                role, first_name, last_name, phone, is_active,
                last_login, created_at, updated_at, allowed_tasks
            FROM users
            WHERE medew_gc_id = @medewGcId";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<PostgresUser>(sql, new { medewGcId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user by MedewGcId: {MedewGcId}", medewGcId);
            throw;
        }
    }

    public async Task UpdateLastLoginAsync(int id)
    {
        const string sql = @"
            UPDATE users
            SET last_login = NOW()
            WHERE id = @id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating last login for user: {Id}", id);
            throw;
        }
    }

    public async Task<ClockwiseProject.Domain.User?> GetFor2FAAsync(int id)
    {
        var sql = $"SELECT {TwoFAColumns} FROM users WHERE id = @id";
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<ClockwiseProject.Domain.User>(sql, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching 2FA data for user {Id}", id);
            throw;
        }
    }

    public async Task UpdateEmailCodeAsync(int id, string code, DateTime expiresAt)
    {
        const string sql = @"
            UPDATE users
            SET two_factor_email_code = @code,
                two_factor_code_expires_at = @expiresAt
            WHERE id = @id";
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new { id, code, expiresAt });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating email code for user {Id}", id);
            throw;
        }
    }

    public async Task<string?> GetSystemSettingAsync(string key)
    {
        const string sql = "SELECT value FROM system_settings WHERE key = @key";
        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.ExecuteScalarAsync<string>(sql, new { key });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching system setting {Key}", key);
            return null;
        }
    }

    public async Task<int> CreateAsync(CreateUserCommand command)
    {
        const string sql = @"
            INSERT INTO users (
                medew_gc_id, username, password_hash, email,
                role, first_name, last_name, phone, is_active
            ) VALUES (
                @medewGcId, @username, @passwordHash, @email,
                @role, @firstName, @lastName, @phone, TRUE
            )
            RETURNING id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var id = await connection.ExecuteScalarAsync<int>(sql, command);

            _logger.LogInformation("Created user with ID {Id}, username {Username}", id, command.Username);
            return id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user: {Username}", command.Username);
            throw;
        }
    }
}

public class PostgresUser
{
    public int Id { get; set; }
    public int MedewGcId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = "user";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string AllowedTasks { get; set; } = "BOTH"; // BOTH, MONTAGE_ONLY, TEKENKAMER_ONLY
}

public class CreateUserCommand
{
    public int MedewGcId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Role { get; set; } = "user";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
}
