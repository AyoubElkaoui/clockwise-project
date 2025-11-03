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
}