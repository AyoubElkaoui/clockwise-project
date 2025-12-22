using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository voor AT_TAAK operaties.
/// </summary>
public interface ITaskRepository
{
    /// <summary>
    /// Haalt alle taken op uit AT_TAAK.
    /// </summary>
    /// <param name="includeHistorical">Include taken waar GC_HISTORISCH_JN = 'J'</param>
    Task<List<TaskDto>> GetAllAsync(bool includeHistorical = false);

    /// <summary>
    /// Haalt één specifieke taak op.
    /// </summary>
    Task<TaskDto?> GetByIdAsync(int gcId);

    /// <summary>
    /// Haalt alle leave/vacation taken op (GC_CODE STARTING WITH 'Z').
    /// </summary>
    Task<List<TaskDto>> GetLeaveTasksAsync(bool includeHistorical = false);

    /// <summary>
    /// Controleert of een taak bestaat.
    /// </summary>
    Task<bool> ExistsAsync(int gcId);
}
