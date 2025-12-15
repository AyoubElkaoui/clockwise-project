using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;

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

            return Ok(new
            {
                message = "✅ Database succesvol geseed!",
                timestamp = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
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

            return Ok(new
            {
                isSeeded = userCount > 0 && projectCount > 0,
                users = userCount,
                projects = projectCount,
                timeEntries = timeEntryCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "❌ Error checking seed status",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Reseed de database (verwijder alles en seed opnieuw)
    /// POST: /api/seed/reseed
    /// </summary>
    [HttpPost("reseed")]
    public ActionResult ReseedDatabase()
    {
        try
        {
            // Verwijder alle data in omgekeerde volgorde van afhankelijkheden
            _context.Activities.RemoveRange(_context.Activities);
            _context.TimeEntries.RemoveRange(_context.TimeEntries);
            _context.VacationRequests.RemoveRange(_context.VacationRequests);
            _context.UserProjects.RemoveRange(_context.UserProjects);
            _context.Projects.RemoveRange(_context.Projects);
            _context.ProjectGroups.RemoveRange(_context.ProjectGroups);
            _context.Companies.RemoveRange(_context.Companies);
            _context.Users.RemoveRange(_context.Users);
            _context.SaveChanges();

            // Seed opnieuw
            SeedData.Initialize(_context);

            return Ok(new
            {
                message = "✅ Database succesvol gereeseed!",
                timestamp = DateTime.Now
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "❌ Reseed failed",
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    /// <summary>
    /// Add missing columns to database
    /// POST: /api/seed/add-columns
    /// </summary>
    [HttpPost("add-columns")]
    public ActionResult AddColumns()
    {
        try
        {
            // First, check table names
            var tables = _context.Database.ExecuteSqlRaw("SELECT r.RDB$RELATION_NAME FROM RDB$RELATIONS r WHERE r.RDB$SYSTEM_FLAG = 0 AND r.RDB$VIEW_BLR IS NULL");
            // Add missing columns
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"TimeEntries\" ADD \"ManagerComment\" BLOB SUB_TYPE TEXT");
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"TimeEntries\" ADD \"ReviewedAt\" TIMESTAMP");
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"TimeEntries\" ADD \"ReviewedBy\" INTEGER");
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"VacationRequests\" ADD \"ManagerComment\" BLOB SUB_TYPE TEXT");
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"VacationRequests\" ADD \"ReviewedAt\" TIMESTAMP");
            _context.Database.ExecuteSqlRaw("ALTER TABLE \"VacationRequests\" ADD \"ReviewedBy\" INTEGER");

            return Ok(new { message = "Columns added successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error adding columns",
                error = ex.Message
            });
        }
    }
}
