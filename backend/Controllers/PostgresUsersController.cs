using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;

namespace backend.Controllers;

/// <summary>
/// Controller for managing users in PostgreSQL database
/// Used by Manager Team page for user management
/// </summary>
[ApiController]
[Route("api/users")]
public class PostgresUsersController : ControllerBase
{
    private readonly IDbConnection _db;
    private readonly ILogger<PostgresUsersController> _logger;

    public PostgresUsersController(IDbConnection db, ILogger<PostgresUsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/users
    /// Get all active users
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            _logger.LogInformation("Getting all users");

            var sql = @"
                SELECT
                    id AS ""Id"",
                    medew_gc_id AS ""MedewGcId"",
                    username AS ""Username"",
                    first_name AS ""FirstName"",
                    last_name AS ""LastName"",
                    email AS ""Email"",
                    phone AS ""Phone"",
                    role AS ""Role"",
                    is_active AS ""IsActive"",
                    contract_hours AS ""ContractHours"",
                    vacation_days AS ""VacationDays"",
                    used_vacation_days AS ""UsedVacationDays""
                FROM users
                ORDER BY first_name, last_name";

            var users = await _db.QueryAsync(sql);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return Ok(new List<object>()); // Return empty list on error
        }
    }

    /// <summary>
    /// GET /api/users/{medewGcId}
    /// Get a user by their medew_gc_id
    /// </summary>
    [HttpGet("{medewGcId:int}")]
    public async Task<IActionResult> GetUserByMedewGcId(int medewGcId)
    {
        try
        {
            _logger.LogInformation("Getting user by medewGcId: {MedewGcId}", medewGcId);

            var sql = @"
                SELECT
                    id,
                    medew_gc_id AS ""medewGcId"",
                    username,
                    first_name AS ""firstName"",
                    last_name AS ""lastName"",
                    email,
                    phone,
                    role,
                    is_active AS ""isActive"",
                    contract_hours AS ""contractHours"",
                    vacation_days AS ""vacationDays"",
                    used_vacation_days AS ""usedVacationDays""
                FROM users
                WHERE medew_gc_id = @MedewGcId";

            var user = await _db.QueryFirstOrDefaultAsync(sql, new { MedewGcId = medewGcId });

            if (user == null)
            {
                _logger.LogWarning("User not found for medewGcId: {MedewGcId}", medewGcId);
                return NotFound(new { error = "Gebruiker niet gevonden" });
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by medewGcId: {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen gebruiker" });
        }
    }

    /// <summary>
    /// PUT /api/users/{medewGcId}
    /// Update a user by their medew_gc_id
    /// </summary>
    [HttpPut("{medewGcId:int}")]
    public async Task<IActionResult> UpdateUserByMedewGcId(int medewGcId, [FromBody] UpdateUserRequest request)
    {
        try
        {
            _logger.LogInformation("Updating user by medewGcId: {MedewGcId}", medewGcId);

            // Check if user exists
            var existingUser = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                new { MedewGcId = medewGcId });

            if (!existingUser.HasValue)
            {
                _logger.LogWarning("User not found for medewGcId: {MedewGcId}", medewGcId);
                return NotFound(new { error = "Gebruiker niet gevonden" });
            }

            var sql = @"
                UPDATE users SET
                    first_name = COALESCE(@FirstName, first_name),
                    last_name = COALESCE(@LastName, last_name),
                    email = COALESCE(@Email, email),
                    phone = COALESCE(@Phone, phone),
                    role = COALESCE(@Role, role),
                    is_active = COALESCE(@IsActive, is_active),
                    contract_hours = COALESCE(@ContractHours, contract_hours),
                    vacation_days = COALESCE(@VacationDays, vacation_days),
                    used_vacation_days = COALESCE(@UsedVacationDays, used_vacation_days),
                    updated_at = CURRENT_TIMESTAMP
                WHERE medew_gc_id = @MedewGcId";

            var rows = await _db.ExecuteAsync(sql, new
            {
                MedewGcId = medewGcId,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Phone = request.Phone,
                Role = request.Rank ?? request.Role, // Support both 'rank' and 'role'
                IsActive = request.Rank != "inactive" && request.IsActive != false,
                ContractHours = request.ContractHours,
                VacationDays = request.VacationDays,
                UsedVacationDays = request.UsedVacationDays
            });

            _logger.LogInformation("Updated {Rows} rows for medewGcId: {MedewGcId}", rows, medewGcId);

            return Ok(new { success = true, message = "Gebruiker bijgewerkt" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user by medewGcId: {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij bijwerken gebruiker" });
        }
    }

    /// <summary>
    /// POST /api/users/login
    /// Login with medew_gc_id
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            _logger.LogInformation("Login attempt for medewGcId: {MedewGcId}", request.MedewGcId);

            var sql = @"
                SELECT
                    id AS ""Id"",
                    medew_gc_id AS ""MedewGcId"",
                    username AS ""Username"",
                    first_name AS ""FirstName"",
                    last_name AS ""LastName"",
                    email AS ""Email"",
                    role AS ""Role"",
                    is_active AS ""IsActive""
                FROM users
                WHERE medew_gc_id = @MedewGcId";

            var user = await _db.QueryFirstOrDefaultAsync(sql, new { MedewGcId = request.MedewGcId });

            if (user == null)
            {
                _logger.LogWarning("Login failed - user not found for medewGcId: {MedewGcId}", request.MedewGcId);
                return Unauthorized(new { error = "Invalid MedewGcId" });
            }

            _logger.LogInformation("Login successful for user: {Username}", user.Username);
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for medewGcId: {MedewGcId}", request.MedewGcId);
            return StatusCode(500, new { error = "Fout bij inloggen" });
        }
    }

    /// <summary>
    /// POST /api/users
    /// Create a new user
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        try
        {
            _logger.LogInformation("Creating new user: {FirstName} {LastName}", request.FirstName, request.LastName);

            // Generate a unique medew_gc_id (temporary - should be from Firebird)
            var maxMedewGcId = await _db.ExecuteScalarAsync<int?>(
                "SELECT COALESCE(MAX(medew_gc_id), 200000) + 1 FROM users");
            var newMedewGcId = maxMedewGcId ?? 200001;

            // Generate username
            var username = $"{request.FirstName?.ToLower().FirstOrDefault()}.{request.LastName?.ToLower().Replace(" ", "")}";

            var sql = @"
                INSERT INTO users (
                    medew_gc_id, username, first_name, last_name, email, phone, role, is_active,
                    contract_hours, vacation_days, used_vacation_days, created_at, updated_at
                )
                VALUES (
                    @MedewGcId, @Username, @FirstName, @LastName, @Email, @Phone, @Role, TRUE,
                    @ContractHours, @VacationDays, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING id, medew_gc_id AS ""medewGcId""";

            var result = await _db.QueryFirstOrDefaultAsync(sql, new
            {
                MedewGcId = newMedewGcId,
                Username = username,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Phone = request.Phone,
                Role = request.Role ?? "user",
                ContractHours = request.ContractHours ?? 40,
                VacationDays = request.VacationDays ?? 25
            });

            // Add to manager_assignments if managerId is provided
            if (request.ManagerId.HasValue && result != null)
            {
                await _db.ExecuteAsync(@"
                    INSERT INTO manager_assignments (manager_id, employee_id, active_from)
                    VALUES (
                        (SELECT id FROM users WHERE medew_gc_id = @ManagerMedewGcId),
                        @EmployeeId,
                        CURRENT_DATE
                    )
                    ON CONFLICT DO NOTHING",
                    new { ManagerMedewGcId = request.ManagerId, EmployeeId = result?.id });
            }

            _logger.LogInformation("Created user with id: {Id}, medewGcId: {MedewGcId}", result?.id, result?.medewGcId);

            return Ok(new { success = true, id = result?.id, medewGcId = result?.medewGcId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return StatusCode(500, new { error = "Fout bij aanmaken gebruiker" });
        }
    }
}

public class UpdateUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public string? Rank { get; set; } // Frontend uses 'rank' sometimes
    public bool? IsActive { get; set; }
    public int? ContractHours { get; set; }
    public int? VacationDays { get; set; }
    public int? UsedVacationDays { get; set; }
}

public class CreateUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public int? ContractHours { get; set; }
    public int? VacationDays { get; set; }
    public int? ManagerId { get; set; }
}

public class LoginRequest
{
    public int MedewGcId { get; set; }
}
