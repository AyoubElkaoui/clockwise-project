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
                    holiday_date,
                    name,
                    type,
                    is_work_allowed,
                    created_by,
                    created_at,
                    notes
                FROM holidays
                WHERE EXTRACT(YEAR FROM holiday_date) = @Year
                ORDER BY holiday_date";

            var result = await _db.QueryAsync(sql, new { Year = targetYear });

            // Map to camelCase for frontend
            var holidays = result.Select(h => new
            {
                id = (int)h.id,
                holidayDate = ((DateTime)h.holiday_date).ToString("yyyy-MM-dd"),
                name = (string)h.name,
                type = (string)h.type,
                isWorkAllowed = (bool)h.is_work_allowed,
                createdBy = h.created_by as int?,
                createdAt = h.created_at as DateTime?,
                notes = h.notes as string
            });

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
                    holiday_date,
                    name,
                    type,
                    is_work_allowed,
                    created_by,
                    created_at,
                    notes
                FROM holidays
                WHERE holiday_date = @Date";

            var h = await _db.QueryFirstOrDefaultAsync(sql, new { Date = date });

            if (h == null)
                return NotFound();

            // Map to camelCase for frontend
            var holiday = new
            {
                id = (int)h.id,
                holidayDate = ((DateTime)h.holiday_date).ToString("yyyy-MM-dd"),
                name = (string)h.name,
                type = (string)h.type,
                isWorkAllowed = (bool)h.is_work_allowed,
                createdBy = h.created_by as int?,
                createdAt = h.created_at as DateTime?,
                notes = h.notes as string
            };

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
            _logger.LogInformation("=== POST /api/holidays START ===");
            _logger.LogInformation("Request: {@Request}", request);
            
            var userIdHeader = Request.Headers["X-User-ID"].FirstOrDefault();
            _logger.LogInformation("X-User-ID header: {UserId}", userIdHeader ?? "(null)");
            
            if (string.IsNullOrEmpty(userIdHeader) || !int.TryParse(userIdHeader, out var userId))
            {
                _logger.LogError("POST /api/holidays: Invalid or missing X-User-ID header");
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user is manager
            _logger.LogInformation("Checking role for userId={UserId}", userId);
            var userRank = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT role FROM users WHERE id = @UserId", 
                new { UserId = userId });
            
            _logger.LogInformation("User role: {Role}", userRank ?? "(null)");

            if (userRank != "manager" && userRank != "admin")
            {
                _logger.LogWarning("User {UserId} with role {Role} attempted to create holiday", userId, userRank);
                return Forbid("Only managers can create holidays");
            }

            // Validate request
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { error = "Holiday name is required" });
            }

            if (string.IsNullOrWhiteSpace(request.HolidayDate))
            {
                return BadRequest(new { error = "Holiday date is required" });
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
                Notes = request.Notes ?? string.Empty
            });

            return CreatedAtAction(nameof(GetHolidayByDate), new { date = request.HolidayDate }, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating holiday: {Message}. Request: {@Request}", ex.Message, request);
            return StatusCode(500, new { error = "Failed to create holiday", details = ex.Message });
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
                "SELECT role FROM users WHERE id = @UserId", 
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
                "SELECT role FROM users WHERE id = @UserId", 
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

    // POST: api/holidays/generate/{year}
    [HttpPost("generate/{year}")]
    public async Task<IActionResult> GenerateHolidaysForYear(int year)
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
                "SELECT role FROM users WHERE id = @UserId",
                new { UserId = userId });

            if (userRank != "manager" && userRank != "admin")
            {
                return Forbid("Only managers can generate holidays");
            }

            // Check if holidays already exist for this year
            var existingCount = await _db.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = @Year AND type = 'national'",
                new { Year = year });

            if (existingCount > 0)
            {
                return Conflict(new { error = $"Feestdagen voor {year} bestaan al ({existingCount} dagen)" });
            }

            // Generate Dutch national holidays for the year
            var holidays = GetDutchNationalHolidays(year);
            var inserted = 0;

            foreach (var holiday in holidays)
            {
                var sql = @"
                    INSERT INTO holidays (holiday_date, name, type, is_work_allowed, created_by, notes)
                    VALUES (@HolidayDate, @Name, 'national', false, @CreatedBy, @Notes)
                    ON CONFLICT (holiday_date, type) DO NOTHING";

                var rows = await _db.ExecuteAsync(sql, new
                {
                    HolidayDate = holiday.Date.ToString("yyyy-MM-dd"),
                    Name = holiday.Name,
                    CreatedBy = userId,
                    Notes = "Automatisch gegenereerd"
                });

                inserted += rows;
            }

            return Ok(new {
                message = $"{inserted} feestdagen gegenereerd voor {year}",
                year = year,
                count = inserted
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating holidays for year {Year}", year);
            return StatusCode(500, new { error = "Failed to generate holidays" });
        }
    }

    private static List<(DateTime Date, string Name)> GetDutchNationalHolidays(int year)
    {
        var holidays = new List<(DateTime Date, string Name)>
        {
            (new DateTime(year, 1, 1), "Nieuwjaarsdag"),
            (new DateTime(year, 4, 27), "Koningsdag"),
            (new DateTime(year, 5, 5), "Bevrijdingsdag"),
            (new DateTime(year, 12, 25), "Eerste Kerstdag"),
            (new DateTime(year, 12, 26), "Tweede Kerstdag"),
        };

        // Koningsdag valt op zondag? Dan zaterdag 26 april
        if (new DateTime(year, 4, 27).DayOfWeek == DayOfWeek.Sunday)
        {
            holidays = holidays.Where(h => h.Name != "Koningsdag").ToList();
            holidays.Add((new DateTime(year, 4, 26), "Koningsdag"));
        }

        // Pasen (bewegelijke feestdag)
        var easter = CalculateEaster(year);
        holidays.Add((easter, "Eerste Paasdag"));
        holidays.Add((easter.AddDays(1), "Tweede Paasdag"));

        // Hemelvaartsdag (39 dagen na Pasen)
        holidays.Add((easter.AddDays(39), "Hemelvaartsdag"));

        // Pinksteren (49 en 50 dagen na Pasen)
        holidays.Add((easter.AddDays(49), "Eerste Pinksterdag"));
        holidays.Add((easter.AddDays(50), "Tweede Pinksterdag"));

        // Goede Vrijdag (2 dagen voor Pasen)
        holidays.Add((easter.AddDays(-2), "Goede Vrijdag"));

        return holidays.OrderBy(h => h.Date).ToList();
    }

    private static DateTime CalculateEaster(int year)
    {
        // Computus algorithm for calculating Easter Sunday
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return new DateTime(year, month, day);
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
                "SELECT role FROM users WHERE id = @UserId", 
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
    [property: System.Text.Json.Serialization.JsonPropertyName("holidayDate")]
    string HolidayDate,
    [property: System.Text.Json.Serialization.JsonPropertyName("name")]
    string Name,
    [property: System.Text.Json.Serialization.JsonPropertyName("type")]
    string Type,
    [property: System.Text.Json.Serialization.JsonPropertyName("isWorkAllowed")]
    bool IsWorkAllowed,
    [property: System.Text.Json.Serialization.JsonPropertyName("notes")]
    string? Notes
);

public record UpdateHolidayRequest(
    bool IsWorkAllowed,
    string? Notes
);
