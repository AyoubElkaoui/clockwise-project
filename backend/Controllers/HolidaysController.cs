using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public HolidaysController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/holidays
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Holiday>>> GetHolidays([FromQuery] int? year)
    {
        var query = _context.Holidays.Include(h => h.Company).AsQueryable();

        if (year.HasValue)
        {
            query = query.Where(h => h.Date.Year == year.Value || h.IsRecurring);
        }

        var holidays = await query.OrderBy(h => h.Date).ToListAsync();
        return Ok(holidays);
    }

    // GET: api/holidays/closed
    [HttpGet("closed")]
    public async Task<IActionResult> GetClosedDays(int year)
    {
        var closedDays = await _context.Holidays
            .Where(h => h.Type == "Sluitingsdag" && (h.Date.Year == year || h.IsRecurring))
            .Select(h => new
            {
                id = h.Id,
                date = h.Date.ToString("yyyy-MM-dd"),
                reason = h.Name
            })
            .ToListAsync();

        return Ok(closedDays);
    }

    // GET: api/holidays/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Holiday>> GetHoliday(int id)
    {
        var holiday = await _context.Holidays
            .Include(h => h.Company)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (holiday == null)
        {
            return NotFound();
        }

        return Ok(holiday);
    }

    // POST: api/holidays
    [HttpPost]
    public async Task<ActionResult<Holiday>> CreateHoliday(HolidayCreateDto dto)
    {
        var holiday = new Holiday
        {
            Name = dto.Name,
            Date = dto.Date,
            Type = dto.Type,
            IsRecurring = dto.IsRecurring,
            CompanyId = dto.CompanyId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Holidays.Add(holiday);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetHoliday), new { id = holiday.Id }, holiday);
    }

    // POST: api/holidays/closed
    [HttpPost("closed")]
    public async Task<IActionResult> AddClosedDays(ClosedDayRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var startDate = DateTime.Parse(request.StartDate);
        var endDate = DateTime.Parse(request.EndDate);

        if (startDate > endDate)
            return BadRequest("Start date must be before or equal to end date");

        var addedDays = new List<object>();
        var holidaysToAdd = new List<Holiday>();

        // Get next Id
        var maxId = await _context.Holidays.MaxAsync(h => (int?)h.Id) ?? 0;
        var nextId = maxId + 1;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            // Check if already exists
            if (await _context.Holidays.AnyAsync(h => h.Date == date && h.Type == "Sluitingsdag"))
                continue;

            var holiday = new Holiday
            {
                Id = nextId++,
                Name = request.Reason,
                Date = date,
                Type = "Sluitingsdag",
                IsRecurring = false,
                CompanyId = null
            };

            holidaysToAdd.Add(holiday);
        }

        _context.Holidays.AddRange(holidaysToAdd);
        await _context.SaveChangesAsync();

        foreach (var holiday in holidaysToAdd)
        {
            addedDays.Add(new
            {
                id = holiday.Id,
                date = holiday.Date.ToString("yyyy-MM-dd"),
                reason = holiday.Name
            });
        }

        return Ok(addedDays);
    }

    // PUT: api/holidays/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHoliday(int id, HolidayUpdateDto dto)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return NotFound();
        }

        holiday.Name = dto.Name;
        holiday.Date = dto.Date;
        holiday.Type = dto.Type;
        holiday.IsRecurring = dto.IsRecurring;
        holiday.CompanyId = dto.CompanyId;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/holidays/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
        {
            return NotFound();
        }

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/holidays/closed/5
    [HttpDelete("closed/{id}")]
    public async Task<IActionResult> DeleteClosedDay(int id)
    {
        var holiday = await _context.Holidays.FirstOrDefaultAsync(h => h.Id == id && h.Type == "Sluitingsdag");
        if (holiday == null)
            return NotFound();

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class HolidayCreateDto
{
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Type { get; set; } = "Feestdag";
    public bool IsRecurring { get; set; }
    public int? CompanyId { get; set; }
}

public class HolidayUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Type { get; set; } = "Feestdag";
    public bool IsRecurring { get; set; }
    public int? CompanyId { get; set; }
}

public class ClosedDayRequest
{
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
