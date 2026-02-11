using backend.Models;
using backend.Repositories;
using ClockwiseProject.Backend.Repositories;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Dapper;

namespace backend.Controllers;

/// <summary>
/// Controller for managing user's favorite projects
/// </summary>
[ApiController]
[Route("api/favorite-projects")]
public class FavoriteProjectsController : ControllerBase
{
    private readonly ILogger<FavoriteProjectsController> _logger;
    private readonly IFirebirdDataRepository _firebirdRepo;
    private readonly string _connectionString;

    public FavoriteProjectsController(
        ILogger<FavoriteProjectsController> logger,
        IFirebirdDataRepository firebirdRepo,
        IConfiguration configuration)
    {
        _logger = logger;
        _firebirdRepo = firebirdRepo;
        _connectionString = configuration.GetConnectionString("PostgreSQL")
            ?? throw new InvalidOperationException("PostgreSQL connection string not found");
    }

    /// <summary>
    /// GET /api/favorite-projects
    /// Get all favorite projects for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<FavoriteProjectDto>>> GetFavorites()
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User ID required" });
            }

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var favorites = await conn.QueryAsync<FavoriteProject>(
                @"SELECT id AS Id, user_id AS UserId, project_gc_id AS ProjectGcId, created_at AS CreatedAt
                  FROM favorite_projects WHERE user_id = @UserId ORDER BY created_at DESC",
                new { UserId = userId.Value });

            // Enrich with Firebird project data
            var result = new List<FavoriteProjectDto>();
            foreach (var fav in favorites)
            {
                var dto = new FavoriteProjectDto
                {
                    Id = fav.Id,
                    UserId = fav.UserId,
                    ProjectGcId = fav.ProjectGcId,
                    CreatedAt = fav.CreatedAt
                };

                try
                {
                    var werkDetails = await _firebirdRepo.GetWerkDetailsAsync(fav.ProjectGcId);
                    dto.ProjectCode = werkDetails.Code;
                    dto.ProjectName = werkDetails.Description;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get project details for {ProjectGcId}", fav.ProjectGcId);
                    dto.ProjectName = $"Project {fav.ProjectGcId}";
                }

                result.Add(dto);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting favorite projects");
            return StatusCode(500, new { error = "Failed to get favorites", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/favorite-projects
    /// Add a project to favorites
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<FavoriteProjectDto>> AddFavorite([FromBody] AddFavoriteRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User ID required" });
            }

            // Validate project exists in Firebird
            if (!await _firebirdRepo.IsValidWerkAsync(request.ProjectGcId))
            {
                return BadRequest(new { error = "Invalid project ID" });
            }

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            // Check if already favorited
            var existing = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = request.ProjectGcId });

            if (existing.HasValue)
            {
                return BadRequest(new { error = "Project is already in favorites" });
            }

            // Insert new favorite
            var id = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO favorite_projects (user_id, project_gc_id, created_at)
                  VALUES (@UserId, @ProjectGcId, NOW())
                  RETURNING id",
                new { UserId = userId.Value, ProjectGcId = request.ProjectGcId });

            // Get enriched DTO
            var dto = new FavoriteProjectDto
            {
                Id = id,
                UserId = userId.Value,
                ProjectGcId = request.ProjectGcId,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                var werkDetails = await _firebirdRepo.GetWerkDetailsAsync(request.ProjectGcId);
                dto.ProjectCode = werkDetails.Code;
                dto.ProjectName = werkDetails.Description;
            }
            catch { }

            _logger.LogInformation("User {UserId} added project {ProjectGcId} to favorites", userId.Value, request.ProjectGcId);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding favorite project");
            return StatusCode(500, new { error = "Failed to add favorite", details = ex.Message });
        }
    }

    /// <summary>
    /// DELETE /api/favorite-projects/{projectGcId}
    /// Remove a project from favorites
    /// </summary>
    [HttpDelete("{projectGcId}")]
    public async Task<ActionResult> RemoveFavorite(int projectGcId)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User ID required" });
            }

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var rowsAffected = await conn.ExecuteAsync(
                "DELETE FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = projectGcId });

            if (rowsAffected == 0)
            {
                return NotFound(new { error = "Favorite not found" });
            }

            _logger.LogInformation("User {UserId} removed project {ProjectGcId} from favorites", userId.Value, projectGcId);
            return Ok(new { success = true, message = "Favorite removed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing favorite project");
            return StatusCode(500, new { error = "Failed to remove favorite", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/favorite-projects/check/{projectGcId}
    /// Check if a project is favorited
    /// </summary>
    [HttpGet("check/{projectGcId}")]
    public async Task<ActionResult<bool>> IsFavorite(int projectGcId)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User ID required" });
            }

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var exists = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = projectGcId });

            return Ok(new { isFavorite = exists.HasValue });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking favorite status");
            return StatusCode(500, new { error = "Failed to check favorite status", details = ex.Message });
        }
    }

    private int? GetUserId()
    {
        // Try X-USER-ID header first
        if (Request.Headers.TryGetValue("X-USER-ID", out var userIdHeader) &&
            int.TryParse(userIdHeader.ToString(), out var userId))
        {
            return userId;
        }

        // Fall back to HttpContext items (set by middleware)
        if (HttpContext.Items.TryGetValue("UserId", out var userIdObj) && userIdObj is int id)
        {
            return id;
        }

        return null;
    }
}
