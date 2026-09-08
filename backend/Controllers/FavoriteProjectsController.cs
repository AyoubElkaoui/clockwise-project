using backend.Models;
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
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<FavoriteProjectDto>>> GetFavorites()
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var favorites = await conn.QueryAsync<FavoriteProject>(
                @"SELECT id AS Id, user_id AS UserId, project_gc_id AS ProjectGcId, created_at AS CreatedAt
                  FROM favorite_projects WHERE user_id = @UserId ORDER BY created_at DESC",
                new { UserId = userId.Value });

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
            _logger.LogError(ex, "Error getting favorite projects for user {UserId}", userId);
            return StatusCode(500, new { error = "Fout bij ophalen favorieten" });
        }
    }

    /// <summary>
    /// POST /api/favorite-projects
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<FavoriteProjectDto>> AddFavorite([FromBody] AddFavoriteRequest? request)
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (request == null || request.ProjectGcId <= 0)
            return BadRequest(new { error = "Ongeldig project-id" });

        try
        {
            if (!await _firebirdRepo.IsValidWerkAsync(request.ProjectGcId))
                return BadRequest(new { error = "Ongeldig project-id" });

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var existing = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = request.ProjectGcId });

            if (existing.HasValue)
                return BadRequest(new { error = "Project staat al in je favorieten" });

            var id = await conn.ExecuteScalarAsync<int>(
                @"INSERT INTO favorite_projects (user_id, project_gc_id, created_at)
                  VALUES (@UserId, @ProjectGcId, NOW())
                  RETURNING id",
                new { UserId = userId.Value, ProjectGcId = request.ProjectGcId });

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
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get project details for {ProjectGcId}", request.ProjectGcId);
            }

            _logger.LogInformation("User {UserId} added project {ProjectGcId} to favorites", userId.Value, request.ProjectGcId);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding favorite project for user {UserId}", userId);
            return StatusCode(500, new { error = "Fout bij toevoegen favoriet" });
        }
    }

    /// <summary>
    /// DELETE /api/favorite-projects/{projectGcId}
    /// </summary>
    [HttpDelete("{projectGcId:int}")]
    public async Task<ActionResult> RemoveFavorite(int projectGcId)
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var rowsAffected = await conn.ExecuteAsync(
                "DELETE FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = projectGcId });

            if (rowsAffected == 0)
                return NotFound(new { error = "Favoriet niet gevonden" });

            _logger.LogInformation("User {UserId} removed project {ProjectGcId} from favorites", userId.Value, projectGcId);
            return Ok(new { success = true, message = "Favoriet verwijderd" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing favorite project for user {UserId}", userId);
            return StatusCode(500, new { error = "Fout bij verwijderen favoriet" });
        }
    }

    /// <summary>
    /// GET /api/favorite-projects/check/{projectGcId}
    /// </summary>
    [HttpGet("check/{projectGcId:int}")]
    public async Task<ActionResult<bool>> IsFavorite(int projectGcId)
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var exists = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM favorite_projects WHERE user_id = @UserId AND project_gc_id = @ProjectGcId",
                new { UserId = userId.Value, ProjectGcId = projectGcId });

            return Ok(new { isFavorite = exists.HasValue });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking favorite status for user {UserId}", userId);
            return StatusCode(500, new { error = "Fout bij controleren favoriet" });
        }
    }
}
