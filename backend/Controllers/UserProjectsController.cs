using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/user-projects")]
public class UserProjectsController : ControllerBase
{
    private readonly IDbConnection _db;
    private readonly ILogger<UserProjectsController> _logger;

    public UserProjectsController(IDbConnection db, ILogger<UserProjectsController> logger)
    {
        _db = db;
        _logger = logger;
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
                    u.first_name || ' ' || u.last_name AS ""userName""
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
                    is_active AS ""isActive""
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
