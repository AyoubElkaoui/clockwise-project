using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/companies")]
[ApiController]
public class CompaniesController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public CompaniesController(ClockwiseDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
    {
        return await _context.Companies.Include(c => c.ProjectGroups).ToListAsync();
    }
}