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

        public ProjectGroupsController(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectGroup>>> GetProjectGroups()
        {
            try
            {
                var groups = await _repository.GetProjectGroupsAsync();
                return Ok(groups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("company/{companyId}")]
        public async Task<ActionResult<IEnumerable<ProjectGroup>>> GetProjectGroupsByCompany(int companyId)
        {
            try
            {
                var groups = await _repository.GetProjectGroupsByCompanyAsync(companyId);
                return Ok(groups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
