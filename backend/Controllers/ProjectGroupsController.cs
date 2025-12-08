using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/project-groups")]
[ApiController]
public class ProjectGroupsController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public ProjectGroupsController(ClockwiseDbContext context)
    {
        _context = context;
    }

    [HttpGet("company/{companyId}")]
    public async Task<ActionResult<IEnumerable<ProjectGroup>>> GetProjectGroups(int companyId)
    {
        return await _context.ProjectGroups
            .Where(pg => pg.CompanyId == companyId)
            .Include(pg => pg.Projects)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<ProjectGroup>> CreateProjectGroup([FromBody] ProjectGroup projectGroup)
    {
        if (projectGroup == null || string.IsNullOrWhiteSpace(projectGroup.Name))
            return BadRequest("Ongeldige invoer");

        _context.ProjectGroups.Add(projectGroup);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProjectGroups), new { companyId = projectGroup.CompanyId }, projectGroup);
    }
}