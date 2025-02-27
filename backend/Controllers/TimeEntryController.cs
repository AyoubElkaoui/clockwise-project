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
        return await _context.TimeEntries.Include(te => te.Project).ToListAsync();
    }

    // POST: api/time-entries
    [HttpPost]
    public async Task<IActionResult> CreateTimeEntry([FromBody] TimeEntry entry)
    {
        if (entry == null)
        {
            return BadRequest("Ongeldige invoer");
        }

        // Als er geen status is meegegeven, stellen we de standaardstatus in:
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

    // Extra endpoint voor het wijzigen van de status (bijvoorbeeld inzending)
    // POST: api/time-entries/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitTimeEntry(int id)
    {
        var entry = await _context.TimeEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound();
        }

        // Wijzig de status naar "ingeleverd" (of "submitted")
        entry.Status = "ingeleverd";
        _context.Entry(entry).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok("Uren ingeleverd");
    }
}
