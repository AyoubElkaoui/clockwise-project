using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;
using backend.Services;
using ClockwiseProject.Backend;

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
    private readonly AuthenticationService _authService;
    private readonly FirebirdConnectionFactory _firebird;

    private const string UserColumns = @"
                    id,
                    medew_gc_id AS ""medewGcId"",
                    username,
                    first_name AS ""firstName"",
                    last_name AS ""lastName"",
                    email,
                    phone,
                    role,
                    CASE WHEN is_active = false THEN 'inactive' ELSE role END AS ""rank"",
                    is_active AS ""isActive"",
                    contract_hours AS ""contractHours"",
                    vacation_days AS ""vacationDays"",
                    used_vacation_days AS ""usedVacationDays"",
                    two_factor_enabled AS ""twoFactorEnabled"",
                    allowed_tasks AS ""allowedTasks"",
                    last_login AS ""lastLogin"",
                    created_at AS ""createdAt""";

    public PostgresUsersController(IDbConnection db, ILogger<PostgresUsersController> logger,
        AuthenticationService authService, FirebirdConnectionFactory firebird)
    {
        _db = db;
        _logger = logger;
        _authService = authService;
        _firebird = firebird;
    }

    // ---- identity helpers (filled by MedewGcIdMiddleware from the validated JWT) ----
    private int? CurrentUserId => HttpContext.Items.TryGetValue("UserId", out var v) && v is int i ? i : null;
    private string CurrentRole => HttpContext.Items.TryGetValue("UserRole", out var v) && v is string r ? r.ToLowerInvariant() : "user";
    private bool IsAdmin => CurrentRole == "admin";
    private bool IsManagerOrAdmin => CurrentRole is "admin" or "manager";

    /// <summary>GET /api/users/me - the logged-in user's own profile.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized(new { error = "Niet ingelogd" });
        var user = await _db.QueryFirstOrDefaultAsync($"SELECT {UserColumns} FROM users WHERE id = @Id", new { Id = userId });
        return user == null ? NotFound(new { error = "Gebruiker niet gevonden" }) : Ok(user);
    }

    /// <summary>PUT /api/users/me - update own name / e-mail / phone. Nothing else.</summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = CurrentUserId;
        if (userId == null) return Unauthorized(new { error = "Niet ingelogd" });
        if (!string.IsNullOrEmpty(request.Email) && !request.Email.Contains('@'))
            return BadRequest(new { error = "Ongeldig e-mailadres" });

        var rows = await _db.ExecuteAsync(@"
            UPDATE users SET
                first_name = COALESCE(@FirstName, first_name),
                last_name  = COALESCE(@LastName, last_name),
                email      = COALESCE(@Email, email),
                phone      = COALESCE(@Phone, phone),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @Id",
            new { Id = userId, request.FirstName, request.LastName, request.Email, request.Phone });
        if (rows == 0) return NotFound(new { error = "Gebruiker niet gevonden" });
        var user = await _db.QueryFirstOrDefaultAsync($"SELECT {UserColumns} FROM users WHERE id = @Id", new { Id = userId });
        return Ok(user);
    }

    /// <summary>GET /api/users/budget-overview?year= - verlofsaldo en jaarbudgetten per uurcode van alle actieve medewerkers (manager/admin).</summary>
    [HttpGet("budget-overview")]
    public async Task<IActionResult> GetBudgetOverview([FromQuery] int? year)
    {
        if (!IsManagerOrAdmin) return Forbid();
        var y = year ?? DateTime.Today.Year;
        var rows = await _db.QueryAsync(@"
            SELECT u.medew_gc_id AS ""medewGcId"", u.first_name AS ""firstName"", u.last_name AS ""lastName"",
                   u.vacation_days AS ""vacationDays"", u.used_vacation_days AS ""usedVacationDays"",
                   a.task_code AS ""taskCode"", a.task_description AS ""taskDescription"", a.annual_budget AS ""annualBudget"", a.used
            FROM users u
            LEFT JOIN user_hour_allocations a ON a.user_id = u.id AND a.year = @Year
            WHERE u.is_active = TRUE AND u.role <> 'admin'
            ORDER BY u.first_name, u.last_name, a.task_code", new { Year = y });
        return Ok(rows);
    }

    /// <summary>GET /api/users/atrium-employees - employees in Atrium (AT_MEDEW) with link status. Manager/admin only.</summary>
    [HttpGet("atrium-employees")]
    public async Task<IActionResult> GetAtriumEmployees()
    {
        if (!IsManagerOrAdmin) return Forbid();
        using var fb = _firebird.CreateConnection();
        await fb.OpenAsync();
        var employees = (await fb.QueryAsync<(int MedewGcId, string? Name)>(
            "SELECT GC_ID, GC_OMSCHRIJVING FROM AT_MEDEW WHERE GC_ID IS NOT NULL ORDER BY GC_OMSCHRIJVING")).ToList();
        var linked = (await _db.QueryAsync<int>("SELECT medew_gc_id FROM users")).ToHashSet();
        return Ok(employees.Select(e => new { medewGcId = e.MedewGcId, name = e.Name?.Trim(), linked = linked.Contains(e.MedewGcId) }));
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

            var sql = $@"SELECT {UserColumns} FROM users
                ORDER BY first_name, last_name";

            var users = await _db.QueryAsync(sql);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return StatusCode(500, new { error = "Fout bij ophalen gebruikers" });
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

            var sql = $@"SELECT {UserColumns} FROM users
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
        if (!IsManagerOrAdmin) return Forbid();
        // Managers mogen teamleden (de)activeren en contractgegevens wijzigen; de ROL wijzigen mag alleen een admin.
        if (request.Role != null && !IsAdmin)
            return StatusCode(403, new { error = "Alleen een admin kan de rol wijzigen" });
        if (request.Role != null && request.Role is not ("user" or "manager" or "admin"))
            return BadRequest(new { error = "Ongeldige rol" });
        if (request.Rank != null && request.Rank is not ("user" or "manager" or "admin" or "inactive"))
            return BadRequest(new { error = "Ongeldige rol" });
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

            // Determine the role and active status
            // "inactive" is NOT a valid role - it only means is_active=false
            string? newRole = null;
            bool? newIsActive = null;

            if (request.Rank != null)
            {
                if (request.Rank == "inactive")
                {
                    // Setting inactive: keep existing role, just deactivate
                    newIsActive = false;
                }
                else
                {
                    // Setting active; the role in "rank" is only applied by an admin (managers re-activate without changing the role)
                    newRole = IsAdmin ? request.Rank : null;
                    newIsActive = true;
                }
            }
            else
            {
                newRole = request.Role;
                if (request.IsActive.HasValue)
                    newIsActive = request.IsActive.Value;
            }

            _logger.LogInformation("Update user {MedewGcId}: Role={Role}, IsActive={IsActive}, Rank={Rank}",
                medewGcId, newRole, newIsActive, request.Rank);

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
                Role = newRole,
                IsActive = newIsActive,
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
    /// POST /api/users
    /// Create a new user
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!IsAdmin) return StatusCode(403, new { error = "Alleen een admin kan gebruikers aanmaken" });
        if (request.MedewGcId <= 0) return BadRequest(new { error = "Kies een Atrium-medewerker (medewGcId)" });
        if (string.IsNullOrWhiteSpace(request.Username)) return BadRequest(new { error = "Gebruikersnaam is verplicht" });
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            return BadRequest(new { error = "Wachtwoord moet minimaal 8 tekens zijn" });
        var role = (request.Role ?? "user").ToLowerInvariant();
        if (role is not ("user" or "manager" or "admin")) return BadRequest(new { error = "Ongeldige rol" });

        // The Atrium employee must exist: hours are booked on this GC_ID in Syntess.
        using (var fb = _firebird.CreateConnection())
        {
            await fb.OpenAsync();
            var exists = await fb.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM AT_MEDEW WHERE GC_ID = @Id", new { Id = request.MedewGcId });
            if (exists == 0) return BadRequest(new { error = $"Medewerker {request.MedewGcId} bestaat niet in Atrium" });
        }

        var username = request.Username.Trim().ToLowerInvariant();
        var clash = await _db.QueryFirstOrDefaultAsync<string>(
            "SELECT CASE WHEN username = @Username THEN 'username' ELSE 'medew' END FROM users WHERE username = @Username OR medew_gc_id = @MedewGcId LIMIT 1",
            new { Username = username, request.MedewGcId });
        if (clash == "username") return Conflict(new { error = "Gebruikersnaam bestaat al" });
        if (clash == "medew") return Conflict(new { error = "Deze Atrium-medewerker heeft al een account" });

        try
        {
            var result = await _db.QueryFirstAsync(@"
                INSERT INTO users (
                    medew_gc_id, username, password_hash, first_name, last_name, email, phone, role, is_active,
                    contract_hours, vacation_days, used_vacation_days, created_at, updated_at
                )
                VALUES (
                    @MedewGcId, @Username, @PasswordHash, @FirstName, @LastName, @Email, @Phone, @Role, TRUE,
                    @ContractHours, @VacationDays, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING id, medew_gc_id AS ""medewGcId""",
                new
                {
                    request.MedewGcId,
                    Username = username,
                    PasswordHash = _authService.HashPassword(request.Password),
                    request.FirstName,
                    request.LastName,
                    request.Email,
                    request.Phone,
                    Role = role,
                    ContractHours = request.ContractHours ?? 40,
                    VacationDays = request.VacationDays ?? 25
                });

            if (request.ManagerId.HasValue)
            {
                await _db.ExecuteAsync(@"
                    INSERT INTO manager_assignments (manager_id, employee_id, active_from)
                    SELECT id, @EmployeeId, CURRENT_DATE FROM users WHERE medew_gc_id = @ManagerMedewGcId
                    ON CONFLICT DO NOTHING",
                    new { ManagerMedewGcId = request.ManagerId, EmployeeId = (int)result.id });
            }

            _logger.LogInformation("Admin {Admin} created user {Id} (medewGcId {MedewGcId})", CurrentUserId, (int)result.id, (int)result.medewGcId);
            return Ok(new { success = true, id = (int)result.id, medewGcId = (int)result.medewGcId, username });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return StatusCode(500, new { error = "Fout bij aanmaken gebruiker" });
        }
    }
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
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
    public decimal? ContractHours { get; set; }
    public decimal? AtvHoursPerWeek { get; set; }
    public int? DisabilityPercentage { get; set; }
    public int? VacationDays { get; set; }
    public int? UsedVacationDays { get; set; }
    public string? HrNotes { get; set; }
}

public class CreateUserRequest
{
    public int MedewGcId { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public int? ContractHours { get; set; }
    public int? VacationDays { get; set; }
    public int? ManagerId { get; set; }
}
