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
    private readonly IDbConnection _db;
    private readonly ILogger<UserProjectsController> _logger;
    private readonly INotificationRepository _notificationRepo;

    public UserProjectsController(IDbConnection db, ILogger<UserProjectsController> logger, INotificationRepository notificationRepo)
    {
        _db = db;
        _logger = logger;
        _notificationRepo = notificationRepo;
    }

    // GET: api/user-projects/users/{userId} - Get all projects for a user (userId=0 returns all)
    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserProjects(int userId)
    {
        try
        {
            string sql;
            object parameters;

            if (userId == 0)
            {
                // Return all user-project assignments
                sql = @"
                    SELECT
                        up.id,
                        up.user_id AS ""userId"",
                        up.project_gc_id AS ""projectId"",
                        up.assigned_by AS ""assignedByUserId"",
                        up.assigned_at AS ""assignedDate"",
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
            // Table doesn't exist - return empty array
            _logger.LogWarning("user_projects table does not exist yet");
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user projects for userId {UserId}", userId);
            return Ok(new List<object>()); // Return empty instead of error
        }
    }

    // GET: api/user-projects/projects/{projectId} - Get all users for a project
    [HttpGet("projects/{projectId}")]
    public async Task<IActionResult> GetProjectUsers(int projectId)
    {
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
            return Ok(new List<object>());
        }
    }

    // PUT: api/user-projects/users/{userId}/projects/{projectId} - Update assignment details
    [HttpPut("users/{userId}/projects/{projectId}")]
    public async Task<IActionResult> UpdateUserProjectAssignment(int userId, int projectId, [FromBody] UpdateAssignmentRequest request)
    {
        try
        {
            var sql = @"
                UPDATE user_projects SET
                    hours_per_week = @HoursPerWeek,
                    notes = @Notes
                WHERE user_id = @UserId AND project_gc_id = @ProjectId";

            var rows = await _db.ExecuteAsync(sql, new
            {
                UserId = userId,
                ProjectId = projectId,
                HoursPerWeek = request.HoursPerWeek,
                Notes = request.Notes
            });

            if (rows == 0)
                return NotFound(new { error = "Toewijzing niet gevonden" });

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user project assignment");
            return StatusCode(500, new { error = "Fout bij bijwerken toewijzing" });
        }
    }

    // POST: api/user-projects - Assign user to project
    [HttpPost]
    public async Task<IActionResult> AssignUserToProject([FromBody] AssignUserRequest request)
    {
        try
        {
            // Check if assignment already exists
            var existingCheck = await _db.ExecuteScalarAsync<int?>(
                "SELECT id FROM user_projects WHERE user_id = @UserId AND project_gc_id = @ProjectId",
                new { UserId = request.UserId, ProjectId = request.ProjectId });

            if (existingCheck.HasValue)
            {
                return Conflict(new { error = "Gebruiker is al gekoppeld aan dit project" });
            }

            var sql = @"
                INSERT INTO user_projects (user_id, project_gc_id, assigned_by, assigned_at)
                VALUES (@UserId, @ProjectId, @AssignedBy, CURRENT_TIMESTAMP)
                RETURNING id";

            var id = await _db.ExecuteScalarAsync<int>(sql, new
            {
                UserId = request.UserId,
                ProjectId = request.ProjectId,
                AssignedBy = request.AssignedByUserId
            });

            // Notificatie sturen naar medewerker
            await _notificationRepo.CreateAsync(new CreateNotificationDto
            {
                UserId = request.UserId,
                Type = "project_assigned",
                Title = "Nieuw project toegewezen",
                Message = $"Je bent toegewezen aan project {request.ProjectId}",
                RelatedEntityType = "project",
                RelatedEntityId = request.ProjectId
            });

            return Ok(new
            {
                id,
                userId = request.UserId,
                projectId = request.ProjectId,
                assignedByUserId = request.AssignedByUserId
            });
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            _logger.LogWarning("user_projects table does not exist yet");
            return StatusCode(500, new { error = "Database tabel bestaat niet. Voer migration uit." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning user to project");
            return StatusCode(500, new { error = "Fout bij toewijzen gebruiker aan project" });
        }
    }

    // GET: api/user-projects/pg-users - Get all active users from PostgreSQL
    [HttpGet("pg-users")]
    public async Task<IActionResult> GetPostgresUsers()
    {
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
                    COALESCE(atv_hours_per_week, 0) AS ""atvHoursPerWeek"",
                    COALESCE(disability_percentage, 0) AS ""disabilityPercentage"",
                    COALESCE(effective_hours_per_week, contract_hours) AS ""effectiveHoursPerWeek"",
                    vacation_days AS ""vacationDays"",
                    used_vacation_days AS ""usedVacationDays"",
                    hr_notes AS ""hrNotes""
                FROM users
                WHERE is_active = TRUE
                ORDER BY first_name, last_name";

            var result = await _db.QueryAsync(sql);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching PostgreSQL users");
            return Ok(new List<object>());
        }
    }

    // DELETE: api/user-projects/users/{userId}/projects/{projectId}
    [HttpDelete("users/{userId}/projects/{projectId}")]
    public async Task<IActionResult> RemoveUserFromProject(int userId, int projectId)
    {
        try
        {
            var rows = await _db.ExecuteAsync(
                "DELETE FROM user_projects WHERE user_id = @UserId AND project_gc_id = @ProjectId",
                new { UserId = userId, ProjectId = projectId });

            if (rows == 0)
                return NotFound(new { error = "Toewijzing niet gevonden" });

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
    int ProjectId,
    int AssignedByUserId
);

public record UpdateAssignmentRequest(
    decimal? HoursPerWeek,
    string? Notes
);
