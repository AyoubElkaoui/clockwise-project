using backend.Models;
using backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service voor AT_TAAK gerelateerde operaties.
/// </summary>
public class TaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly ILogger<TaskService> _logger;

    public TaskService(
        ITaskRepository taskRepository,
        ILogger<TaskService> logger)
    {
        _taskRepository = taskRepository;
        _logger = logger;
    }

    /// <summary>
    /// Haalt alle taken op.
    /// </summary>
    public async Task<List<TaskDto>> GetAllTasksAsync(bool includeHistorical = false)
    {
        _logger.LogInformation("Fetching all tasks (includeHistorical={IncludeHistorical})", includeHistorical);

        var tasks = await _taskRepository.GetAllAsync(includeHistorical);

        _logger.LogInformation("Found {Count} tasks", tasks.Count);

        return tasks;
    }

    /// <summary>
    /// Haalt één specifieke taak op.
    /// </summary>
    public async Task<TaskDto?> GetTaskByIdAsync(int gcId)
    {
        _logger.LogInformation("Fetching task by ID={GcId}", gcId);

        return await _taskRepository.GetByIdAsync(gcId);
    }

    /// <summary>
    /// Controleert of een taak bestaat.
    /// </summary>
    public async Task<bool> TaskExistsAsync(int gcId)
    {
        return await _taskRepository.ExistsAsync(gcId);
    }
}
