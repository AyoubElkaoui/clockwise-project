using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository for time entry workflow operations (PostgreSQL)
/// </summary>
public interface IWorkflowRepository
{
    /// <summary>
    /// Save or update a draft time entry
    /// </summary>
    Task<TimeEntryWorkflow> SaveDraftAsync(TimeEntryWorkflow entry);

    /// <summary>
    /// Get draft entries for an employee
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetDraftsByEmployeeAsync(int medewGcId, int urenperGcId);

    /// <summary>
    /// Get submitted entries for an employee
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetSubmittedByEmployeeAsync(int medewGcId, int urenperGcId);

    /// <summary>
    /// Get all submitted entries (for manager review)
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetAllSubmittedAsync(int urenperGcId, int? managerMedewGcId = null);

    /// <summary>
    /// Get all entries for a period with optional status filter (for manager overview)
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetAllByPeriodAsync(int urenperGcId, string? status = null);

    /// <summary>
    /// Get approved entries for an employee
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetApprovedByEmployeeAsync(int medewGcId, int urenperGcId);

    /// <summary>
    /// Get rejected entries for an employee
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetRejectedByEmployeeAsync(int medewGcId, int urenperGcId);

    /// <summary>
    /// Get entry by ID
    /// </summary>
    Task<TimeEntryWorkflow?> GetByIdAsync(int id);

    /// <summary>
    /// Get multiple entries by IDs
    /// </summary>
    Task<List<TimeEntryWorkflow>> GetByIdsAsync(List<int> ids);

    /// <summary>
    /// Check if duplicate entry exists (same medew, datum, taak, werk)
    /// </summary>
    Task<TimeEntryWorkflow?> FindDuplicateAsync(int medewGcId, DateTime datum, int taakGcId, int? werkGcId, int urenperGcId);

    /// <summary>
    /// Update entry status
    /// </summary>
    Task UpdateStatusAsync(int id, string status, DateTime? statusChangedAt = null);

    /// <summary>
    /// Update multiple entries
    /// </summary>
    Task UpdateEntriesAsync(List<TimeEntryWorkflow> entries);

    /// <summary>
    /// Delete draft entry
    /// </summary>
    Task DeleteAsync(int id);
}
