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
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(IFirebirdDataRepository repository, ILogger<ProjectsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects([FromQuery] int? groupId)
        {
            if (!groupId.HasValue)
            {
                var allProjects = await _repository.GetAllProjectsAsync();
                _logger.LogInformation("Retrieved {Count} projects", allProjects.Count());
                return Ok(allProjects);
            }

            var projects = await _repository.GetProjectsByGroupAsync(groupId.Value);
            _logger.LogInformation("Retrieved {Count} projects for group {GroupId}", projects.Count(), groupId.Value);
            return Ok(projects);
        }
    }
}
