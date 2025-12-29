using backend.Models;
using ClockwiseProject.Backend;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

/// <summary>
/// PostgreSQL implementation of workflow repository
/// </summary>
public class PostgresWorkflowRepository : IWorkflowRepository
{
    private readonly PostgresDbContext _context;
    private readonly ILogger<PostgresWorkflowRepository> _logger;

    public PostgresWorkflowRepository(
        PostgresDbContext context,
        ILogger<PostgresWorkflowRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<TimeEntryWorkflow> SaveDraftAsync(TimeEntryWorkflow entry)
    {
        // Check if entry already exists
        var existing = await FindDuplicateAsync(
            entry.MedewGcId,
            entry.Datum,
            entry.TaakGcId,
            entry.WerkGcId,
            entry.UrenperGcId);

        if (existing != null)
        {
            // Update existing draft
            existing.Aantal = entry.Aantal;
            existing.Omschrijving = entry.Omschrijving;
            existing.UpdatedAt = DateTime.UtcNow;

            _context.TimeEntriesWorkflow.Update(existing);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Updated existing draft entry {Id} for employee {MedewGcId}, date {Datum}",
                existing.Id, entry.MedewGcId, entry.Datum);

            return existing;
        }
        else
        {
            // Create new draft
            entry.Status = "DRAFT";
            entry.CreatedAt = DateTime.UtcNow;
            entry.UpdatedAt = DateTime.UtcNow;

            _context.TimeEntriesWorkflow.Add(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Created new draft entry {Id} for employee {MedewGcId}, date {Datum}",
                entry.Id, entry.MedewGcId, entry.Datum);

            return entry;
        }
    }

    public async Task<List<TimeEntryWorkflow>> GetDraftsByEmployeeAsync(int medewGcId, int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.MedewGcId == medewGcId
                     && e.UrenperGcId == urenperGcId
                     && e.Status == "DRAFT")
            .OrderBy(e => e.Datum)
            .ToListAsync();
    }

    public async Task<List<TimeEntryWorkflow>> GetSubmittedByEmployeeAsync(int medewGcId, int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.MedewGcId == medewGcId
                     && e.UrenperGcId == urenperGcId
                     && e.Status == "SUBMITTED")
            .OrderBy(e => e.Datum)
            .ToListAsync();
    }

    public async Task<List<TimeEntryWorkflow>> GetAllSubmittedAsync(int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.UrenperGcId == urenperGcId && e.Status == "SUBMITTED")
            .OrderBy(e => e.MedewGcId)
            .ThenBy(e => e.Datum)
            .ToListAsync();
    }

    public async Task<List<TimeEntryWorkflow>> GetApprovedByEmployeeAsync(int medewGcId, int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.MedewGcId == medewGcId
                     && e.UrenperGcId == urenperGcId
                     && e.Status == "APPROVED")
            .OrderBy(e => e.Datum)
            .ToListAsync();
    }

    public async Task<List<TimeEntryWorkflow>> GetRejectedByEmployeeAsync(int medewGcId, int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.MedewGcId == medewGcId
                     && e.UrenperGcId == urenperGcId
                     && e.Status == "REJECTED")
            .OrderBy(e => e.Datum)
            .ToListAsync();
    }

    public async Task<TimeEntryWorkflow?> GetByIdAsync(int id)
    {
        return await _context.TimeEntriesWorkflow.FindAsync(id);
    }

    public async Task<List<TimeEntryWorkflow>> GetByIdsAsync(List<int> ids)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => ids.Contains(e.Id))
            .ToListAsync();
    }

    public async Task<TimeEntryWorkflow?> FindDuplicateAsync(
        int medewGcId,
        DateTime datum,
        int taakGcId,
        int? werkGcId,
        int urenperGcId)
    {
        return await _context.TimeEntriesWorkflow
            .Where(e => e.MedewGcId == medewGcId
                     && e.Datum.Date == datum.Date
                     && e.TaakGcId == taakGcId
                     && e.WerkGcId == werkGcId
                     && e.UrenperGcId == urenperGcId
                     && (e.Status == "DRAFT" || e.Status == "SUBMITTED"))
            .FirstOrDefaultAsync();
    }

    public async Task UpdateStatusAsync(int id, string status, DateTime? statusChangedAt = null)
    {
        var entry = await GetByIdAsync(id);
        if (entry == null)
        {
            throw new ArgumentException($"Entry {id} not found");
        }

        entry.Status = status;
        entry.UpdatedAt = DateTime.UtcNow;

        if (status == "SUBMITTED" && statusChangedAt.HasValue)
        {
            entry.SubmittedAt = statusChangedAt.Value;
        }
        else if ((status == "APPROVED" || status == "REJECTED") && statusChangedAt.HasValue)
        {
            entry.ReviewedAt = statusChangedAt.Value;
        }

        _context.TimeEntriesWorkflow.Update(entry);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateEntriesAsync(List<TimeEntryWorkflow> entries)
    {
        foreach (var entry in entries)
        {
            entry.UpdatedAt = DateTime.UtcNow;
        }

        _context.TimeEntriesWorkflow.UpdateRange(entries);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entry = await GetByIdAsync(id);
        if (entry != null)
        {
            _context.TimeEntriesWorkflow.Remove(entry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted draft entry {Id}", id);
        }
    }
}
