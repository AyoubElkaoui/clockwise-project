// backend/Controllers/UserProjectsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/user-projects")]
[ApiController]
public class UserProjectsController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public UserProjectsController(ClockwiseDbContext context)
    {
        _context = context;
    }

    // GET: api/user-projects
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetUserProjects()
    {
        var userProjects = await _context.UserProjects
            .Include(up => up.User)
            .Include(up => up.Project)
            .ThenInclude(p => p.ProjectGroup)
            .ThenInclude(pg => pg.Company)
            .ToListAsync();

        var result = userProjects.Select(up => new
        {
            id = up.Id,
            userId = up.UserId,
            projectId = up.ProjectId,
            assignedDate = up.AssignedDate,
            assignedByUserId = up.AssignedByUserId,
            user = up.User != null ? new { 
                id = up.User.Id, 
                fullName = $"{up.User.FirstName} {up.User.LastName}" 
            } : null,
            project = up.Project != null ? new
            {
                id = up.Project.Id,
                name = up.Project.Name,
                projectGroup = up.Project.ProjectGroup != null ? new
                {
                    id = up.Project.ProjectGroup.Id,
                    name = up.Project.ProjectGroup.Name,
                    company = up.Project.ProjectGroup.Company != null ? new
                    {
                        id = up.Project.ProjectGroup.Company.Id,
                        name = up.Project.ProjectGroup.Company.Name
                    } : null
                } : null
            } : null
        });

        return Ok(result);
    }

    // GET: api/user-projects/users/{userId}
    [HttpGet("users/{userId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetUserProjectsByUser(int userId)
    {
        IQueryable<UserProject> query = _context.UserProjects
            .Include(up => up.Project)
            .ThenInclude(p => p.ProjectGroup)
            .ThenInclude(pg => pg.Company);

        // Als userId=0, haal alle koppelingen op
        if (userId > 0)
        {
            query = query.Where(up => up.UserId == userId);
        }

        var userProjects = await query.ToListAsync();

        var result = userProjects.Select(up => new
        {
            id = up.Id,
            userId = up.UserId,
            projectId = up.ProjectId,
            assignedDate = up.AssignedDate,
            assignedByUserId = up.AssignedByUserId,
            // User wordt niet meegenomen in deze query
            project = up.Project != null ? new
            {
                id = up.Project.Id,
                name = up.Project.Name,
                projectGroup = up.Project.ProjectGroup != null ? new
                {
                    id = up.Project.ProjectGroup.Id,
                    name = up.Project.ProjectGroup.Name,
                    company = up.Project.ProjectGroup.Company != null ? new
                    {
                        id = up.Project.ProjectGroup.Company.Id,
                        name = up.Project.ProjectGroup.Company.Name
                    } : null
                } : null
            } : null
        });

        return Ok(result);
    }

    // GET: api/user-projects/projects/{projectId}
    [HttpGet("projects/{projectId}")]
    public async Task<ActionResult<IEnumerable<UserProject>>> GetUserProjectsByProject(int projectId)
    {
        return await _context.UserProjects
            .Include(up => up.User)
            .Where(up => up.ProjectId == projectId)
            .ToListAsync();
    }

    // POST: api/user-projects
    [HttpPost]
    public async Task<ActionResult<UserProject>> AssignUserToProject(UserProjectDto dto)
    {
        // Controleer of de koppeling al bestaat
        bool exists = await _context.UserProjects
            .AnyAsync(up => up.UserId == dto.UserId && up.ProjectId == dto.ProjectId);
            
        if (exists)
        {
            return BadRequest("Deze gebruiker is al gekoppeld aan dit project");
        }

        var userProject = new UserProject
        {
            UserId = dto.UserId,
            ProjectId = dto.ProjectId,
            AssignedByUserId = dto.AssignedByUserId
        };

        _context.UserProjects.Add(userProject);
        await _context.SaveChangesAsync();

        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = dto.UserId,
            Type = "project",
            Action = "assigned",
            Message = $"Je bent toegewezen aan een nieuw project",
            Details = $"ProjectId: {dto.ProjectId}"
        };
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserProjects), new { id = userProject.Id }, userProject);
    }

    // DELETE: api/user-projects/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveUserFromProject(int id)
    {
        var userProject = await _context.UserProjects.FindAsync(id);
        if (userProject == null)
        {
            return NotFound();
        }

        _context.UserProjects.Remove(userProject);
        
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = userProject.UserId,
            Type = "project",
            Action = "removed",
            Message = $"Je bent verwijderd van een project",
            Details = $"ProjectId: {userProject.ProjectId}"
        };
        _context.Activities.Add(activity);
        
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/user-projects/users/{userId}/projects/{projectId}
    [HttpDelete("users/{userId}/projects/{projectId}")]
    public async Task<IActionResult> RemoveUserFromProjectByIds(int userId, int projectId)
    {
        var userProject = await _context.UserProjects
            .FirstOrDefaultAsync(up => up.UserId == userId && up.ProjectId == projectId);
            
        if (userProject == null)
        {
            return NotFound();
        }

        _context.UserProjects.Remove(userProject);
        
        // Voeg activiteit toe
        var activity = new Activity
        {
            UserId = userId,
            Type = "project",
            Action = "removed",
            Message = $"Je bent verwijderd van een project",
            Details = $"ProjectId: {projectId}"
        };
        _context.Activities.Add(activity);
        
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class UserProjectDto
{
    public int UserId { get; set; }
    public int ProjectId { get; set; }
    public int? AssignedByUserId { get; set; }
}