using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/project-groups")]
    public class ProjectGroupsController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;
        private readonly ILogger<ProjectGroupsController> _logger;

        public ProjectGroupsController(IFirebirdDataRepository repository, ILogger<ProjectGroupsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectGroup>>> GetProjectGroups()
        {
            var groups = await _repository.GetProjectGroupsAsync();
            _logger.LogInformation("Retrieved {Count} project groups", groups.Count());
            return Ok(groups);
        }

        [HttpGet("company/{companyId}")]
        public async Task<ActionResult<IEnumerable<ProjectGroup>>> GetProjectGroupsByCompany(int companyId)
        {
            var groups = await _repository.GetProjectGroupsByCompanyAsync(companyId);
            _logger.LogInformation("Retrieved {Count} project groups for company {CompanyId}", groups.Count(), companyId);
            return Ok(groups);
        }
    }
}
