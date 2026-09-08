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

    /// <summary>Alle regels (alle statussen) van een medewerker in een datumbereik, voor week-/maandweergave en kalender.</summary>
    Task<List<TimeEntryWorkflow>> GetByEmployeeAndDateRangeAsync(int medewGcId, DateTime from, DateTime to);

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

    /// <summary>Alle regels van alle medewerkers in een datumbereik (manager/admin rapportage).</summary>
    Task<List<TimeEntryWorkflow>> GetAllByDateRangeAsync(DateTime from, DateTime to, string? status = null);

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
    /// Update entry status (review). Only succeeds when the entry is still SUBMITTED; returns affected row count.
    /// </summary>
    Task<int> UpdateStatusAsync(int id, string status, DateTime? statusChangedAt = null);

    /// <summary>
    /// Atomically claim a SUBMITTED entry for approval (status -> APPROVING). Returns false when the
    /// entry was not in SUBMITTED (already claimed/approved/rejected by another request).
    /// </summary>
    Task<bool> TryClaimForApprovalAsync(int id);

    /// <summary>
    /// Finalize an APPROVING entry as APPROVED with its Firebird document id. Returns affected row count.
    /// </summary>
    Task<int> MarkApprovedAsync(int id, int reviewedBy, DateTime reviewedAt, int? firebirdGcId);

    /// <summary>
    /// Release an APPROVING claim back to SUBMITTED (after a failed Firebird insert). Returns affected row count.
    /// </summary>
    Task<int> ReleaseApprovalClaimAsync(int id);

    /// <summary>
    /// Mark a SUBMITTED entry as REJECTED. Returns affected row count (0 = not SUBMITTED anymore).
    /// </summary>
    Task<int> MarkRejectedAsync(int id, int reviewedBy, DateTime reviewedAt, string? rejectionReason);

    /// <summary>
    /// Update multiple entries
    /// </summary>
    Task UpdateEntriesAsync(List<TimeEntryWorkflow> entries);

    /// <summary>
    /// Delete draft entry
    /// </summary>
    Task DeleteAsync(int id);
}
