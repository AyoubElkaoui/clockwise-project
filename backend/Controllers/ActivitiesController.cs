using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/activities")]
[ApiController]
public class ActivitiesController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public ActivitiesController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/activities
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Activity>>> GetActivities([FromQuery] int limit = 20, [FromQuery] int userId = 0)
    {
        var query = _context.Activities
            .Include(a => a.User)
            .OrderByDescending(a => a.Timestamp);

        // Filter op userId indien meegegeven
        if (userId > 0)
        {
            query = query.Where(a => a.UserId == userId).OrderByDescending(a => a.Timestamp);
        }

        return await query.Take(limit).ToListAsync();
    }

    // GET: api/activities/team?managerId=5
    [HttpGet("team")]
    public async Task<ActionResult<IEnumerable<Activity>>> GetTeamActivities([FromQuery] int managerId, [FromQuery] int limit = 50)
    {
        // Haal eerst alle team member IDs op
        var teamMemberIds = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Rank == "user")
            .Select(u => u.Id)
            .ToListAsync();

        // Voeg manager ID toe aan de lijst
        teamMemberIds.Add(managerId);

        var activities = await _context.Activities
            .Include(a => a.User)
            .Where(a => teamMemberIds.Contains(a.UserId))
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();

        return Ok(activities);
    }

    // POST: api/activities
    [HttpPost]
    public async Task<ActionResult<Activity>> CreateActivity(Activity activity)
    {
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, activity);
    }

    // GET: api/activities/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Activity>> GetActivity(int id)
    {
        var activity = await _context.Activities
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity == null)
            return NotFound();

        return activity;
    }

    // PUT: api/activities/{id}/read
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var activity = await _context.Activities.FindAsync(id);
        if (activity == null)
            return NotFound();

        activity.Read = true;
        _context.Entry(activity).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // PUT: api/activities/read-all
    // PUT: api/activities/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] int userId)
    {
        if (userId <= 0)
            return BadRequest("UserId is vereist");

        var activities = await _context.Activities
            .Where(a => a.UserId == userId && !a.Read)
            .ToListAsync();

        foreach (var activity in activities)
        {
            activity.Read = true;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
