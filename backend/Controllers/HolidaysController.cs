using Microsoft.AspNetCore.Mvc;
using Dapper;
using System.Data;
using System.Globalization;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private const string ManagerOnlyMessage = "Alleen managers of beheerders mogen feestdagen beheren";

    private readonly IDbConnection _db;
    private readonly ILogger<HolidaysController> _logger;

    public HolidaysController(IDbConnection db, ILogger<HolidaysController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: api/holidays?year=2026 (publiek)
    [HttpGet]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year)
    {
        var targetYear = year ?? DateTime.Now.Year;
        if (targetYear < 2000 || targetYear > 2100)
            return BadRequest(new { error = "Jaar moet tussen 2000 en 2100 liggen" });

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
                WHERE EXTRACT(YEAR FROM holiday_date) = @Year
                ORDER BY holiday_date";

            var result = await _db.QueryAsync(sql, new { Year = targetYear });
            var holidays = result.Select(MapHoliday).ToList();
            return Ok(holidays);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P01")
        {
            _logger.LogWarning("holidays table does not exist yet - returning empty list");
            return Ok(new List<object>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching holidays for year {Year}", targetYear);
            return StatusCode(500, new { error = "Fout bij ophalen feestdagen" });
        }
    }

    // GET: api/holidays/{date} (publiek)
    [HttpGet("{date}")]
    public async Task<IActionResult> GetHolidayByDate(string date)
    {
        if (!TryParseDate(date, out var parsedDate))
            return BadRequest(new { error = "Ongeldige datum, gebruik het formaat yyyy-MM-dd" });

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

            var h = await _db.QueryFirstOrDefaultAsync(sql, new { Date = parsedDate.Date });

            if (h == null)
                return NotFound(new { error = "Geen feestdag gevonden op deze datum" });

            return Ok(MapHoliday(h));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching holiday by date {Date}", date);
            return StatusCode(500, new { error = "Fout bij ophalen feestdag" });
        }
    }

    // POST: api/holidays (manager/admin)
    [HttpPost]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest? request)
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        if (request == null)
            return BadRequest(new { error = "Ongeldige aanvraag" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Naam van de feestdag is verplicht" });

        if (!TryParseDate(request.HolidayDate, out var holidayDate))
            return BadRequest(new { error = "Ongeldige datum, gebruik het formaat yyyy-MM-dd" });

        var type = string.IsNullOrWhiteSpace(request.Type) ? "company" : request.Type.Trim();

        try
        {
            var existing = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM holidays WHERE holiday_date = @Date AND type = @Type",
                new { Date = holidayDate.Date, Type = type });

            if (existing.HasValue)
                return Conflict(new { error = "Er bestaat al een feestdag op deze datum" });

            var sql = @"
                INSERT INTO holidays (holiday_date, name, type, is_work_allowed, created_by, notes)
                VALUES (@HolidayDate, @Name, @Type, @IsWorkAllowed, @CreatedBy, @Notes)
                RETURNING id";

            var id = await _db.ExecuteScalarAsync<int>(sql, new
            {
                HolidayDate = holidayDate.Date,
                Name = request.Name.Trim(),
                Type = type,
                IsWorkAllowed = request.IsWorkAllowed,
                CreatedBy = userId.Value,
                Notes = request.Notes ?? string.Empty
            });

            return CreatedAtAction(nameof(GetHolidayByDate), new { date = holidayDate.ToString("yyyy-MM-dd") }, new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating holiday on {Date}", request.HolidayDate);
            return StatusCode(500, new { error = "Fout bij aanmaken feestdag" });
        }
    }

    // PUT: api/holidays/{id} (manager/admin)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] UpdateHolidayRequest? request)
    {
        if (this.CurrentUserId() == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        if (request == null)
            return BadRequest(new { error = "Ongeldige aanvraag" });

        try
        {
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
                return NotFound(new { error = "Feestdag niet gevonden" });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating holiday {Id}", id);
            return StatusCode(500, new { error = "Fout bij bijwerken feestdag" });
        }
    }

    // DELETE: api/holidays/{id} (manager/admin)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        if (this.CurrentUserId() == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        try
        {
            var holidayType = await _db.QueryFirstOrDefaultAsync<string>(
                "SELECT type FROM holidays WHERE id = @Id",
                new { Id = id });

            if (holidayType == "national")
                return BadRequest(new { error = "Nationale feestdagen kunnen niet worden verwijderd" });

            var rows = await _db.ExecuteAsync("DELETE FROM holidays WHERE id = @Id", new { Id = id });

            if (rows == 0)
                return NotFound(new { error = "Feestdag niet gevonden" });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting holiday {Id}", id);
            return StatusCode(500, new { error = "Fout bij verwijderen feestdag" });
        }
    }

    // POST: api/holidays/generate/{year} (manager/admin)
    [HttpPost("generate/{year:int}")]
    public async Task<IActionResult> GenerateHolidaysForYear(int year)
    {
        var userId = this.CurrentUserId();
        if (userId == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        if (year < 2000 || year > 2100)
            return BadRequest(new { error = "Jaar moet tussen 2000 en 2100 liggen" });

        try
        {
            var existingCount = await _db.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = @Year AND type = 'national'",
                new { Year = year });

            if (existingCount > 0)
                return Conflict(new { error = $"Feestdagen voor {year} bestaan al ({existingCount} dagen)" });

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
                    HolidayDate = holiday.Date.Date,
                    Name = holiday.Name,
                    CreatedBy = userId.Value,
                    Notes = "Automatisch gegenereerd"
                });

                inserted += rows;
            }

            return Ok(new
            {
                message = $"{inserted} feestdagen gegenereerd voor {year}",
                year,
                count = inserted
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating holidays for year {Year}", year);
            return StatusCode(500, new { error = "Fout bij genereren feestdagen" });
        }
    }

    // POST: api/holidays/toggle-work/{id} (manager/admin)
    [HttpPost("toggle-work/{id:int}")]
    public async Task<IActionResult> ToggleWorkAllowed(int id)
    {
        if (this.CurrentUserId() == null)
            return Unauthorized(new { error = "Niet ingelogd" });

        if (!this.IsManagerOrAdmin())
            return StatusCode(403, new { error = ManagerOnlyMessage });

        try
        {
            var sql = @"
                UPDATE holidays
                SET is_work_allowed = NOT is_work_allowed
                WHERE id = @Id
                RETURNING is_work_allowed";

            var newValue = await _db.ExecuteScalarAsync<bool?>(sql, new { Id = id });
            if (!newValue.HasValue)
                return NotFound(new { error = "Feestdag niet gevonden" });

            return Ok(new { isWorkAllowed = newValue.Value });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling work permission for holiday {Id}", id);
            return StatusCode(500, new { error = "Fout bij wijzigen werktoestemming" });
        }
    }

    private static bool TryParseDate(string? input, out DateTime date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(input)) return false;
        return DateTime.TryParseExact(input.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)
            || DateTime.TryParse(input.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }

    private static object MapHoliday(dynamic h)
    {
        var row = (IDictionary<string, object?>)h;
        return new
        {
            id = ToInt(row["id"]),
            holidayDate = ToDateTime(row["holiday_date"])?.ToString("yyyy-MM-dd"),
            name = row["name"] as string ?? string.Empty,
            type = row["type"] as string ?? string.Empty,
            isWorkAllowed = row["is_work_allowed"] is bool b && b,
            createdBy = ToNullableInt(row["created_by"]),
            createdAt = ToDateTime(row["created_at"]),
            notes = row["notes"] as string
        };
    }

    private static int ToInt(object? value) => value == null || value is DBNull ? 0 : Convert.ToInt32(value);
    private static int? ToNullableInt(object? value) => value == null || value is DBNull ? null : Convert.ToInt32(value);
    private static DateTime? ToDateTime(object? value) => value == null || value is DBNull ? null : Convert.ToDateTime(value);

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

        var easter = CalculateEaster(year);
        holidays.Add((easter, "Eerste Paasdag"));
        holidays.Add((easter.AddDays(1), "Tweede Paasdag"));
        holidays.Add((easter.AddDays(39), "Hemelvaartsdag"));
        holidays.Add((easter.AddDays(49), "Eerste Pinksterdag"));
        holidays.Add((easter.AddDays(50), "Tweede Pinksterdag"));
        holidays.Add((easter.AddDays(-2), "Goede Vrijdag"));

        return holidays.OrderBy(h => h.Date).ToList();
    }

    private static DateTime CalculateEaster(int year)
    {
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
}

public record CreateHolidayRequest(
    [property: System.Text.Json.Serialization.JsonPropertyName("holidayDate")]
    string? HolidayDate,
    [property: System.Text.Json.Serialization.JsonPropertyName("name")]
    string? Name,
    [property: System.Text.Json.Serialization.JsonPropertyName("type")]
    string? Type,
    [property: System.Text.Json.Serialization.JsonPropertyName("isWorkAllowed")]
    bool IsWorkAllowed,
    [property: System.Text.Json.Serialization.JsonPropertyName("notes")]
    string? Notes
);

public record UpdateHolidayRequest(
    bool IsWorkAllowed,
    string? Notes
);
