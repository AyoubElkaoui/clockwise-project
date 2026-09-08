using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/users/{medewGcId:int}/hour-allocations")]
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
    /// Eigen toewijzingen, of die van anderen voor managers/beheerders.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllocations(int medewGcId, [FromQuery] int? year)
    {
        var current = this.CurrentMedewGcId();
        if (!current.HasValue)
            return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

        if (medewGcId != current.Value && !this.IsManagerOrAdmin())
            return StatusCode(403, new { error = "Je mag alleen je eigen uurcode-toewijzingen bekijken" });

        try
        {
            var targetYear = year ?? DateTime.Now.Year;

            var userId = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                new { MedewGcId = medewGcId });

            if (!userId.HasValue)
                return NotFound(new { error = "Gebruiker niet gevonden" });

            var sql = @"
                SELECT
                    id,
                    task_code AS ""taskCode"",
                    task_description AS ""taskDescription"",
                    annual_budget AS ""annualBudget"",
                    used,
                    year
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
    /// Bulk upsert (alleen manager/admin)
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdateAllocations(int medewGcId, [FromBody] UpdateAllocationsRequest? request)
    {
        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = "Alleen managers of beheerders mogen uurcode-toewijzingen wijzigen" });

        if (request == null || request.Allocations == null)
            return BadRequest(new { error = "Ongeldige aanvraag" });

        foreach (var alloc in request.Allocations)
        {
            if (alloc == null || string.IsNullOrWhiteSpace(alloc.TaskCode))
                return BadRequest(new { error = "Elke toewijzing moet een uurcode hebben" });
            if (alloc.AnnualBudget < 0 || (alloc.Used.HasValue && alloc.Used.Value < 0))
                return BadRequest(new { error = "Budget en verbruik mogen niet negatief zijn" });
        }

        if (request.Year.HasValue && (request.Year.Value < 2000 || request.Year.Value > 2100))
            return BadRequest(new { error = "Jaar moet tussen 2000 en 2100 liggen" });

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

            _logger.LogInformation("User {Actor} updated {Count} hour allocations for medewGcId: {MedewGcId}, year: {Year}",
                this.CurrentUserId(), request.Allocations.Count, medewGcId, targetYear);

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
