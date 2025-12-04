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
