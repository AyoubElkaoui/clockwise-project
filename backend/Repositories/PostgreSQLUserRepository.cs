using Dapper;
using ClockwiseProject.Backend.Data;

namespace backend.Repositories;

public class PostgreSQLUserRepository
{
    private readonly PostgreSQLConnectionFactory _connectionFactory;
    private readonly ILogger<PostgreSQLUserRepository> _logger;

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
                updated_at AS UpdatedAt
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
                last_login, created_at, updated_at
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
                last_login, created_at, updated_at
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
