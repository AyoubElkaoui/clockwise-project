using Microsoft.AspNetCore.Mvc;

[Route("api/seed")]
[ApiController]
public class SeedController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public SeedController(ClockwiseDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Seed de database met test data
    /// POST: /api/seed
    /// </summary>
    [HttpPost]
    public ActionResult SeedDatabase()
    {
        try
        {
            // Run migrations
            _context.Database.Migrate();
            
            // Seed data
            SeedData.Initialize(_context);
            
            return Ok(new { 
                message = "✅ Database succesvol geseed!",
                timestamp = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "❌ Seed failed",
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    /// <summary>
    /// Check of database al geseed is
    /// GET: /api/seed/status
    /// </summary>
    [HttpGet("status")]
    public ActionResult GetSeedStatus()
    {
        try
        {
            var userCount = _context.Users.Count();
            var projectCount = _context.Projects.Count();
            var timeEntryCount = _context.TimeEntries.Count();
            
            return Ok(new { 
                isSeeded = userCount > 0 && projectCount > 0,
                users = userCount,
                projects = projectCount,
                timeEntries = timeEntryCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "❌ Error checking seed status",
                error = ex.Message
            });
        }
    }
}
