using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/users/{medewGcId}/hour-allocations")]
public class UserHourAllocationsController : ControllerBase
{
    private readonly IDbConnection _db;
    private readonly ILogger<UserHourAllocationsController> _logger;

    public UserHourAllocationsController(IDbConnection db, ILogger<UserHourAllocationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/users/{medewGcId}/hour-allocations?year=2026
    /// Get all hour code allocations for a user
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllocations(int medewGcId, [FromQuery] int? year)
    {
        try
        {
            var targetYear = year ?? DateTime.Now.Year;

            // Get user id from medewGcId
            var userId = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                new { MedewGcId = medewGcId });

            if (!userId.HasValue)
                return NotFound(new { error = "Gebruiker niet gevonden" });

            var sql = @"
                SELECT
                    id AS ""Id"",
                    task_code AS ""TaskCode"",
                    task_description AS ""TaskDescription"",
                    annual_budget AS ""AnnualBudget"",
                    used AS ""Used"",
                    year AS ""Year""
                FROM user_hour_allocations
                WHERE user_id = @UserId AND year = @Year
                ORDER BY task_code";

            var allocations = await _db.QueryAsync(sql, new { UserId = userId.Value, Year = targetYear });
            return Ok(allocations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting hour allocations for medewGcId: {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen uurcode toewijzingen" });
        }
    }

    /// <summary>
    /// PUT /api/users/{medewGcId}/hour-allocations
    /// Bulk upsert hour code allocations for a user
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdateAllocations(int medewGcId, [FromBody] UpdateAllocationsRequest request)
    {
        try
        {
            var targetYear = request.Year ?? DateTime.Now.Year;

            var userId = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                new { MedewGcId = medewGcId });

            if (!userId.HasValue)
                return NotFound(new { error = "Gebruiker niet gevonden" });

            foreach (var alloc in request.Allocations)
            {
                var sql = @"
                    INSERT INTO user_hour_allocations (user_id, task_code, task_description, annual_budget, used, year)
                    VALUES (@UserId, @TaskCode, @TaskDescription, @AnnualBudget, @Used, @Year)
                    ON CONFLICT (user_id, task_code, year)
                    DO UPDATE SET
                        task_description = COALESCE(@TaskDescription, user_hour_allocations.task_description),
                        annual_budget = @AnnualBudget,
                        used = @Used,
                        updated_at = CURRENT_TIMESTAMP";

                await _db.ExecuteAsync(sql, new
                {
                    UserId = userId.Value,
                    TaskCode = alloc.TaskCode,
                    TaskDescription = alloc.TaskDescription,
                    AnnualBudget = alloc.AnnualBudget,
                    Used = alloc.Used ?? 0m,
                    Year = targetYear
                });
            }

            _logger.LogInformation("Updated {Count} hour allocations for medewGcId: {MedewGcId}, year: {Year}",
                request.Allocations.Count, medewGcId, targetYear);

            return Ok(new { success = true, message = "Uurcode toewijzingen bijgewerkt" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating hour allocations for medewGcId: {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij opslaan uurcode toewijzingen" });
        }
    }
}

public class UpdateAllocationsRequest
{
    public int? Year { get; set; }
    public List<AllocationItem> Allocations { get; set; } = new();
}

public class AllocationItem
{
    public string TaskCode { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public decimal AnnualBudget { get; set; }
    public decimal? Used { get; set; }
}
