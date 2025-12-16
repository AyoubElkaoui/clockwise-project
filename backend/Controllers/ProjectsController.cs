using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/projects")]
    public class ProjectsController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;

        public ProjectsController(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects([FromQuery] int? groupId)
        {
            if (!groupId.HasValue)
                return BadRequest("groupId is required");

            var projects = await _repository.GetProjectsByGroupAsync(groupId.Value);
            return Ok(projects);
        }
    }
}
