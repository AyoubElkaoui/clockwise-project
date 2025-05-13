using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/time-entries")]
[ApiController]
public class TimeEntryController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public TimeEntryController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/time-entries
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimeEntry>>> GetTimeEntries()
    {
        // Include Project -> ThenInclude ProjectGroup -> ThenInclude Company
        var entries = await _context.TimeEntries
            .Include(te => te.Project)
                .ThenInclude(p => p.ProjectGroup)
                    .ThenInclude(pg => pg.Company)
            .ToListAsync();

        return entries;
    }

    // POST: api/time-entries
    [HttpPost]
    public async Task<IActionResult> CreateTimeEntry([FromBody] TimeEntry entry)
    {
        if (entry == null)
        {
            return BadRequest("Ongeldige invoer");
        }

        if (string.IsNullOrEmpty(entry.Status))
        {
            entry.Status = "opgeslagen";
        }

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();
        return Ok("Uren opgeslagen!");
    }

    // PUT: api/time-entries/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTimeEntry(int id, [FromBody] TimeEntry updatedEntry)
    {
        if (id != updatedEntry.Id)
        {
            return BadRequest("ID mismatch");
        }

        _context.Entry(updatedEntry).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.TimeEntries.Any(e => e.Id == id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return Ok("Uren bijgewerkt");
    }

    // DELETE: api/time-entries/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimeEntry(int id)
    {
        var entry = await _context.TimeEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        _context.TimeEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return Ok("Uren verwijderd");
    }

    // POST: api/time-entries/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
        {
            return NotFound();
        }

        entry.Status = "ingeleverd";
        _context.Entry(entry).State = EntityState.Modified;
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "submitted",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn ingeleverd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok("Uren ingeleverd");
    }
    
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
            return NotFound();

        entry.Status = "goedgekeurd";
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "approved",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn goedgekeurd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok();
    }


    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .FirstOrDefaultAsync(te => te.Id == id);
        
        if (entry == null)
            return NotFound();

        entry.Status = "afgekeurd";
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = entry.UserId,
            Type = "time_entry",
            Action = "rejected",
            Message = $"Uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn afgekeurd",
            Details = $"Project: {entry.Project?.Name ?? "Onbekend"}"
        };
    
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return Ok();
    }
    

    [HttpGet("{id}/details")]
    public async Task<ActionResult<TimeEntry>> GetTimeEntryDetails(int id)
    {
        var entry = await _context.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .ThenInclude(p => p.ProjectGroup)
            .ThenInclude(pg => pg.Company)
            .FirstOrDefaultAsync(te => te.Id == id);
    
        if (entry == null)
            return NotFound();
    
        return entry;
    }
    
    
}
