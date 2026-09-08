using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;
using backend.Repositories;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/user-projects")]
public class UserProjectsController : ControllerBase
{
    private const string ManagerOnlyMessage = "Alleen managers of beheerders mogen projecttoewijzingen beheren";

    private readonly IDbConnection _db;
    private readonly ILogger<UserProjectsController> _logger;
    private readonly INotificationRepository _notificationRepo;

    public UserProjectsController(IDbConnection db, ILogger<UserProjectsController> logger, INotificationRepository notificationRepo)
    {
        _db = db;
        _logger = logger;
        _notificationRepo = notificationRepo;
    }

    // GET: api/user-projects/users/{userId} - eigen toewijzingen, of alles/anderen voor manager/admin (userId=0 = alle)
    [HttpGet("users/{userId:int}")]
    public async Task<IActionResult> GetUserProjects(int userId)
    {
        var current = this.CurrentUserId();
        if (!current.HasValue)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (userId != current.Value && !this.IsManagerOrAdmin())
            return StatusCode(403, new { error = "Je mag alleen je eigen projecttoewijzingen bekijken" });

        try
        {
            string sql;
            object parameters;

            if (userId == 0)
            {
                sql = @"
                    SELECT
                        up.id,
                        up.user_id AS ""userId"",
                        up.project_gc_id AS ""projectId"",
                        up.assigned_by AS ""assignedByUserId"",
                        up.assigned_at AS ""assignedDate"",
                        up.hours_per_week AS ""hoursPerWeek"",
                        up.max_hours AS ""maxHours"",
                        up.notes,
                        u.first_name || ' ' || u.last_name AS ""userName""
                    FROM user_projects up
                    LEFT JOIN users u ON up.user_id = u.id
                    ORDER BY up.assigned_at DESC";
                parameters = new { };
            }
            else
            {
                sql = @"
                    SELECT
                        up.id,
                        up.user_id AS ""userId"",
                        up.project_gc_id AS ""projectId"",
                        up.assigned_by AS ""assignedByUserId"",
                        up.assigned_at AS ""assignedDate"",
                        up.hours_per_week AS ""hoursPerWeek"",
                        up.max_hours AS ""maxHours"",
                        up.notes,
                        u.first_name || ' ' || u.last_name AS ""userName""
                    FROM user_projects up
                    LEFT JOIN users u ON up.user_id = u.id
                    WHERE up.user_id = @UserId
                    ORDER BY up.assigned_at DESC";
                parameters = new { UserId = userId };
            }

            var result = await _db.QueryAsync(sql, parameters);
            return Ok(result);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            _logger.LogWarning("user_projects table does not exist yet");
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user projects for userId {UserId}", userId);
            return StatusCode(500, new { error = "Fout bij ophalen projecttoewijzingen" });
        }
    }

    // GET: api/user-projects/projects/{projectId} - alle gebruikers op een project (ingelogd)
    [HttpGet("projects/{projectId:int}")]
    public async Task<IActionResult> GetProjectUsers(int projectId)
    {
        if (!this.CurrentUserId().HasValue)
            return Unauthorized(new { error = "Niet ingelogd" });

        try
        {
            var sql = @"
                SELECT
                    up.id,
                    up.user_id AS ""userId"",
                    up.project_gc_id AS ""projectId"",
                    up.assigned_by AS ""assignedByUserId"",
                    up.assigned_at AS ""assignedDate"",
                    up.hours_per_week AS ""hoursPerWeek"",
                    up.max_hours AS ""maxHours"",
                    up.notes,
                    u.first_name || ' ' || u.last_name AS ""userName"",
                    u.contract_hours AS ""contractHours""
                FROM user_projects up
                LEFT JOIN users u ON up.user_id = u.id
                WHERE up.project_gc_id = @ProjectId
                ORDER BY u.first_name, u.last_name";

            var result = await _db.QueryAsync(sql, new { ProjectId = projectId });
            return Ok(result);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            _logger.LogWarning("user_projects table does not exist yet");
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching project users for projectId {ProjectId}", projectId);
            return StatusCode(500, new { error = "Fout bij ophalen projectgebruikers" });
        }
    }

    // PUT: api/user-projects/users/{userId}/projects/{projectId} (manager/admin)
    [HttpPut("users/{userId:int}/projects/{projectId:int}")]
    public async Task<IActionResult> UpdateUserProjectAssignment(int userId, int projectId, [FromBody] UpdateAssignmentRequest? request)
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        if (request == null)
            return BadRequest(new { error = "Ongeldige aanvraag" });

        if ((request.HoursPerWeek.HasValue && request.HoursPerWeek.Value < 0) ||
            (request.MaxHours.HasValue && request.MaxHours.Value < 0))
            return BadRequest(new { error = "Uren mogen niet negatief zijn" });

        try
        {
            var sql = @"
                UPDATE user_projects
                SET hours_per_week = @HoursPerWeek, max_hours = @MaxHours, notes = @Notes
                WHERE user_id = @UserId AND project_gc_id = @ProjectId";

            var rows = await _db.ExecuteAsync(sql, new
            {
                UserId = userId,
                ProjectId = projectId,
                HoursPerWeek = request.HoursPerWeek,
                MaxHours = request.MaxHours,
                Notes = request.Notes
            });

            if (rows == 0)
                return NotFound(new { error = "Toewijzing niet gevonden" });

            _logger.LogInformation("User {Actor} updated assignment for user {UserId} on project {ProjectId}: {Hours} hours/week",
                this.CurrentUserId(), userId, projectId, request.HoursPerWeek);

            return Ok(new { success = true, message = "Toewijzing bijgewerkt" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating assignment for user {UserId} on project {ProjectId}", userId, projectId);
            return StatusCode(500, new { error = "Fout bij bijwerken toewijzing" });
        }
    }

    // POST: api/user-projects (manager/admin); assigned_by = aanroeper
    [HttpPost]
    public async Task<IActionResult> AssignUserToProject([FromBody] AssignUserRequest? request)
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        var assignedBy = this.CurrentUserId();
        if (!assignedBy.HasValue)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (request == null || request.UserId <= 0 || request.ProjectId <= 0)
            return BadRequest(new { error = "Ongeldige aanvraag: userId en projectId zijn verplicht" });

        try
        {
            var existingCheck = await _db.ExecuteScalarAsync<int?>(
                "SELECT id FROM user_projects WHERE user_id = @UserId AND project_gc_id = @ProjectId",
                new { UserId = request.UserId, ProjectId = request.ProjectId });

            if (existingCheck.HasValue)
                return Conflict(new { error = "Gebruiker is al gekoppeld aan dit project" });

            var sql = @"
                INSERT INTO user_projects (user_id, project_gc_id, assigned_by, assigned_at)
                VALUES (@UserId, @ProjectId, @AssignedBy, CURRENT_TIMESTAMP)
                RETURNING id";

            var id = await _db.ExecuteScalarAsync<int>(sql, new
            {
                UserId = request.UserId,
                ProjectId = request.ProjectId,
                AssignedBy = assignedBy.Value
            });

            try
            {
                await _notificationRepo.CreateAsync(new CreateNotificationDto
                {
                    UserId = request.UserId,
                    Type = "project_assigned",
                    Title = "Nieuw project toegewezen",
                    Message = $"Je bent toegewezen aan project {request.ProjectId}",
                    RelatedEntityType = "project",
                    RelatedEntityId = request.ProjectId
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send project_assigned notification to user {UserId}", request.UserId);
            }

            return Ok(new
            {
                id,
                userId = request.UserId,
                projectId = request.ProjectId,
                assignedByUserId = assignedBy.Value
            });
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            _logger.LogError(ex, "user_projects table does not exist yet");
            return StatusCode(500, new { error = "Database tabel bestaat niet. Voer migration uit." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning user to project");
            return StatusCode(500, new { error = "Fout bij toewijzen gebruiker aan project" });
        }
    }

    // GET: api/user-projects/pg-users (manager/admin)
    [HttpGet("pg-users")]
    public async Task<IActionResult> GetPostgresUsers()
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = "Alleen managers of beheerders mogen de gebruikerslijst opvragen" });

        try
        {
            var sql = @"
                SELECT
                    id,
                    medew_gc_id AS ""medewGcId"",
                    username,
                    first_name AS ""firstName"",
                    last_name AS ""lastName"",
                    email,
                    role,
                    is_active AS ""isActive"",
                    contract_hours AS ""contractHours"",
                    vacation_days AS ""vacationDays"",
                    used_vacation_days AS ""usedVacationDays""
                FROM users
                WHERE is_active = TRUE
                ORDER BY first_name, last_name";

            var result = await _db.QueryAsync(sql);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching PostgreSQL users");
            return StatusCode(500, new { error = "Fout bij ophalen gebruikers" });
        }
    }

    // DELETE: api/user-projects/users/{userId}/projects/{projectId} (manager/admin)
    [HttpDelete("users/{userId:int}/projects/{projectId:int}")]
    public async Task<IActionResult> RemoveUserFromProject(int userId, int projectId)
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        try
        {
            var rows = await _db.ExecuteAsync(
                "DELETE FROM user_projects WHERE user_id = @UserId AND project_gc_id = @ProjectId",
                new { UserId = userId, ProjectId = projectId });

            if (rows == 0)
                return NotFound(new { error = "Toewijzing niet gevonden" });

            _logger.LogInformation("User {Actor} removed user {UserId} from project {ProjectId}",
                this.CurrentUserId(), userId, projectId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing user from project");
            return StatusCode(500, new { error = "Fout bij verwijderen toewijzing" });
        }
    }
}

public record AssignUserRequest(
    int UserId,
    int ProjectId
);

public record UpdateAssignmentRequest(
    decimal? HoursPerWeek,
    decimal? MaxHours,
    string? Notes
);
