using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/vacation-requests")]
[ApiController]
public class VacationRequestsController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public VacationRequestsController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/vacation-requests
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VacationRequest>>> GetVacationRequests()
    {
        return await _context.VacationRequests
            .Include(v => v.User)
            .ToListAsync();
    }

    // POST: api/vacation-requests
    [HttpPost]
    public async Task<IActionResult> CreateVacationRequest([FromBody] VacationRequest vacation)
    {
        if (vacation == null)
            return BadRequest("Ongeldige invoer");

        // Bereken het aantal verlofuren (bijvoorbeeld: aantal werkdagen * 8 uur)
        int days = (vacation.EndDate.Date - vacation.StartDate.Date).Days + 1;
        vacation.Hours = days * 8; // pas dit eventueel aan op basis van contract
        vacation.Status = "pending"; // standaard

        _context.VacationRequests.Add(vacation);
    
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = vacation.UserId,
            Type = "vacation",
            Action = "submitted",
            Message = $"Vakantie-aanvraag van {vacation.StartDate.ToString("dd-MM-yyyy")} tot {vacation.EndDate.ToString("dd-MM-yyyy")} is ingediend",
            Details = $"Uren: {vacation.Hours}, Reden: {vacation.Reason ?? "Geen reden opgegeven"}"
        };
    
        _context.Activities.Add(activity);
    
        await _context.SaveChangesAsync();
        return Ok("Vakantie aangevraagd!");
    }

    // PUT: api/vacation-requests/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVacationRequest(int id, [FromBody] VacationRequest updatedVacation)
    {
        if (id != updatedVacation.Id)
            return BadRequest("ID mismatch");

        _context.Entry(updatedVacation).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.VacationRequests.AnyAsync(v => v.Id == id))
                return NotFound();
            else
                throw;
        }
        return Ok("Vakantie bijgewerkt");
    }

    // DELETE: api/vacation-requests/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVacationRequest(int id)
    {
        var vacation = await _context.VacationRequests.FindAsync(id);
        if (vacation == null)
            return NotFound();

        _context.VacationRequests.Remove(vacation);
        await _context.SaveChangesAsync();
        return Ok("Vakantie verwijderd");
    }
}
