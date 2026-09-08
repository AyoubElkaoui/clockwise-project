using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller voor AT_TAAK operaties.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;
    private readonly ILogger<TasksController> _logger;

    public TasksController(
        TaskService taskService,
        ILogger<TasksController> logger)
    {
        _taskService = taskService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/tasks
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<TasksResponse>> GetTasks(
        [FromQuery] bool includeHistorical = false)
    {
        try
        {
            var tasks = await _taskService.GetAllTasksAsync(includeHistorical);

            return Ok(new TasksResponse
            {
                Tasks = tasks,
                TotalCount = tasks.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tasks");
            return StatusCode(500, new { error = "Fout bij ophalen taken" });
        }
    }

    /// <summary>
    /// GET /api/tasks/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDto>> GetTaskById(int id)
    {
        try
        {
            var task = await _taskService.GetTaskByIdAsync(id);

            if (task == null)
                return NotFound(new { error = $"Taak met id {id} niet gevonden" });

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching task {Id}", id);
            return StatusCode(500, new { error = "Fout bij ophalen taak" });
        }
    }
}
