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

    // GET: api/vacation-requests (ADMIN - alle vakantie aanvragen)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VacationRequest>>> GetVacationRequests()
    {
        return await _context.VacationRequests
            .Include(v => v.User)
            .OrderByDescending(v => v.StartDate)
            .ToListAsync();
    }

    // GET: api/vacation-requests/team?managerId=5 (MANAGER - team vakantie)
    [HttpGet("team")]
    public async Task<ActionResult<IEnumerable<VacationRequest>>> GetTeamVacationRequests([FromQuery] int managerId)
    {
        var teamMemberIds = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Rank == "user")
            .Select(u => u.Id)
            .ToListAsync();

        var vacations = await _context.VacationRequests
            .Include(v => v.User)
            .Where(v => teamMemberIds.Contains(v.UserId))
            .OrderByDescending(v => v.StartDate)
            .ToListAsync();

        return Ok(vacations);
    }

    // GET: api/vacation-requests/team/pending?managerId=5 (MANAGER - pending)
    [HttpGet("team/pending")]
    public async Task<ActionResult<IEnumerable<VacationRequest>>> GetTeamPendingVacations([FromQuery] int managerId)
    {
        var teamMemberIds = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Rank == "user")
            .Select(u => u.Id)
            .ToListAsync();

        var pending = await _context.VacationRequests
            .Include(v => v.User)
            .Where(v => teamMemberIds.Contains(v.UserId) && v.Status == "pending")
            .OrderByDescending(v => v.StartDate)
            .ToListAsync();

        return Ok(pending);
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

    // GET: api/vacation-requests/annual-overview?year=2025
    [HttpGet("annual-overview")]
    public async Task<ActionResult<object>> GetAnnualVacationOverview([FromQuery] int? year)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;

        var users = await _context.Users
            .Where(u => u.Rank == "user" || u.Rank == "manager")
            .ToListAsync();

        var vacations = await _context.VacationRequests
            .Where(v => v.Status == "approved" && 
                   (v.StartDate.Year == targetYear || v.EndDate.Year == targetYear))
            .ToListAsync();

        var overview = users.Select(user => {
            var userVacations = vacations.Where(v => v.UserId == user.Id).ToList();
            var totalHours = userVacations.Sum(v => v.Hours);
            var totalDays = totalHours / 8.0;

            return new {
                UserId = user.Id,
                UserName = $"{user.FirstName} {user.LastName}",
                Email = user.Email,
                TotalVacationDays = totalDays,
                TotalVacationHours = totalHours,
                ApprovedRequests = userVacations.Count,
                Requests = userVacations.Select(v => new {
                    v.Id,
                    v.StartDate,
                    v.EndDate,
                    v.Hours,
                    Days = v.Hours / 8.0,
                    v.Reason
                }).OrderBy(v => v.StartDate)
            };
        }).OrderByDescending(u => u.TotalVacationDays);

        return Ok(new {
            Year = targetYear,
            Overview = overview
        });
    }
}
