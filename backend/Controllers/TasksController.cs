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
    /// Haalt alle taken op uit AT_TAAK.
    /// </summary>
    /// <param name="includeHistorical">Include historische taken (GC_HISTORISCH_JN = 'J')</param>
    [HttpGet]
    public async Task<ActionResult<TasksResponse>> GetTasks(
        [FromQuery] bool includeHistorical = false)
    {
        try
        {
            _logger.LogInformation("GET /api/tasks called (includeHistorical={IncludeHistorical})", includeHistorical);

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
            return StatusCode(500, new { error = "Failed to fetch tasks", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/tasks/{id}
    /// Haalt één specifieke taak op.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTaskById(int id)
    {
        try
        {
            _logger.LogInformation("GET /api/tasks/{Id} called", id);

            var task = await _taskService.GetTaskByIdAsync(id);

            if (task == null)
            {
                return NotFound(new { error = $"Task with ID {id} not found" });
            }

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching task {Id}", id);
            return StatusCode(500, new { error = "Failed to fetch task", details = ex.Message });
        }
    }
}
