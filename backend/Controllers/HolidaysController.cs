using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly IDbConnection _db;
    private readonly ILogger<HolidaysController> _logger;

    public HolidaysController(IDbConnection db, ILogger<HolidaysController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: api/holidays?year=2026 (Public - no auth required)
    [HttpGet]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year)
    {
        try
        {
            var targetYear = year ?? DateTime.Now.Year;
            
            var sql = @"
                SELECT 
                    id,
                    holiday_date AS holidayDate,
                    name,
                    type,
                    is_work_allowed AS isWorkAllowed,
                    created_by AS createdBy,
                    created_at AS createdAt,
                    notes
                FROM holidays
                WHERE EXTRACT(YEAR FROM holiday_date) = @Year
                ORDER BY holiday_date";

            var holidays = await _db.QueryAsync(sql, new { Year = targetYear });
            return Ok(holidays);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching holidays");
            // If table doesn't exist, return empty array instead of error
            _logger.LogWarning("Holidays table might not exist yet - returning empty array");
            return Ok(new List<object>());
        }
    }

    // GET: api/holidays/{date}
    [HttpGet("{date}")]
    public async Task<IActionResult> GetHolidayByDate(string date)
    {
        try
        {
            var sql = @"
                SELECT 
                    id,
                    holiday_date AS holidayDate,
                    name,
                    type,
                    is_work_allowed AS isWorkAllowed,
                    created_by AS createdBy,
                    created_at AS createdAt,
                    notes
                FROM holidays
                WHERE holiday_date = @Date";

            var holiday = await _db.QueryFirstOrDefaultAsync(sql, new { Date = date });
            
            if (holiday == null)
                return NotFound();
                
            return Ok(holiday);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching holiday by date");
            return StatusCode(500, new { error = "Failed to fetch holiday" });
        }
    }

    // POST: api/holidays
    [HttpPost]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        try
        {
            var userIdHeader = Request.Headers["X-User-ID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !int.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user is manager
            var userRank = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT rank FROM users WHERE id = @UserId", 
                new { UserId = userId });

            if (userRank != "manager" && userRank != "admin")
            {
                return Forbid("Only managers can create holidays");
            }

            // Check if holiday already exists for this date
            var existing = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM holidays WHERE holiday_date = @Date AND type = @Type",
                new { Date = request.HolidayDate, Type = request.Type });

            if (existing.HasValue)
            {
                return Conflict(new { error = "Holiday already exists for this date" });
            }

            var sql = @"
                INSERT INTO holidays (holiday_date, name, type, is_work_allowed, created_by, notes)
                VALUES (@HolidayDate, @Name, @Type, @IsWorkAllowed, @CreatedBy, @Notes)
                RETURNING id";

            var id = await _db.ExecuteScalarAsync<int>(sql, new
            {
                HolidayDate = request.HolidayDate,
                Name = request.Name,
                Type = request.Type,
                IsWorkAllowed = request.IsWorkAllowed,
                CreatedBy = userId,
                Notes = request.Notes
            });

            return CreatedAtAction(nameof(GetHolidayByDate), new { date = request.HolidayDate }, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating holiday");
            return StatusCode(500, new { error = "Failed to create holiday" });
        }
    }

    // PUT: api/holidays/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] UpdateHolidayRequest request)
    {
        try
        {
            var userIdHeader = Request.Headers["X-User-ID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !int.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user is manager
            var userRank = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT rank FROM users WHERE id = @UserId", 
                new { UserId = userId });

            if (userRank != "manager" && userRank != "admin")
            {
                return Forbid("Only managers can update holidays");
            }

            var sql = @"
                UPDATE holidays
                SET is_work_allowed = @IsWorkAllowed,
                    notes = @Notes
                WHERE id = @Id";

            var rows = await _db.ExecuteAsync(sql, new
            {
                Id = id,
                IsWorkAllowed = request.IsWorkAllowed,
                Notes = request.Notes
            });

            if (rows == 0)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating holiday");
            return StatusCode(500, new { error = "Failed to update holiday" });
        }
    }

    // DELETE: api/holidays/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        try
        {
            var userIdHeader = Request.Headers["X-User-ID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !int.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user is manager
            var userRank = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT rank FROM users WHERE id = @UserId", 
                new { UserId = userId });

            if (userRank != "manager" && userRank != "admin")
            {
                return Forbid("Only managers can delete holidays");
            }

            // Only allow deletion of company/closed days, not national holidays
            var holidayType = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT type FROM holidays WHERE id = @Id", 
                new { Id = id });

            if (holidayType == "national")
            {
                return BadRequest(new { error = "Cannot delete national holidays" });
            }

            var rows = await _db.ExecuteAsync("DELETE FROM holidays WHERE id = @Id", new { Id = id });

            if (rows == 0)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting holiday");
            return StatusCode(500, new { error = "Failed to delete holiday" });
        }
    }

    // POST: api/holidays/toggle-work/{id}
    [HttpPost("toggle-work/{id}")]
    public async Task<IActionResult> ToggleWorkAllowed(int id)
    {
        try
        {
            var userIdHeader = Request.Headers["X-User-ID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !int.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user is manager
            var userRank = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT rank FROM users WHERE id = @UserId", 
                new { UserId = userId });

            if (userRank != "manager" && userRank != "admin")
            {
                return Forbid("Only managers can toggle work permissions");
            }

            var sql = @"
                UPDATE holidays
                SET is_work_allowed = NOT is_work_allowed
                WHERE id = @Id
                RETURNING is_work_allowed";

            var newValue = await _db.ExecuteScalarAsync<bool>(sql, new { Id = id });

            return Ok(new { isWorkAllowed = newValue });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling work permission");
            return StatusCode(500, new { error = "Failed to toggle work permission" });
        }
    }
}

public record CreateHolidayRequest(
    string HolidayDate,
    string Name,
    string Type,
    bool IsWorkAllowed,
    string? Notes
);

public record UpdateHolidayRequest(
    bool IsWorkAllowed,
    string? Notes
);
