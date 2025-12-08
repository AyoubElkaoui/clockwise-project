using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/projects")]
[ApiController]
public class ProjectsController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public ProjectsController(ClockwiseDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
    {
        return await _context.Projects.ToListAsync();
    }

    [HttpGet("group/{projectGroupId}")]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjectsByGroup(int projectGroupId)
    {
        return await _context.Projects
            .Where(p => p.ProjectGroupId == projectGroupId)
            .ToListAsync();
    }
}