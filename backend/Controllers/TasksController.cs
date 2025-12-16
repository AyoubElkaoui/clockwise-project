using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    public class TasksController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;

        public TasksController(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        [HttpGet("work")]
        public async Task<ActionResult<IEnumerable<Task>>> GetWorkTasks()
        {
            var tasks = await _repository.GetWorkTasksAsync();
            return Ok(tasks);
        }

        [HttpGet("vacation")]
        public async Task<ActionResult<IEnumerable<Task>>> GetVacationTasks()
        {
            var tasks = await _repository.GetVacationTasksAsync();
            return Ok(tasks);
        }
    }
}
