using backend.Models;
using backend.Repositories;
using ClockwiseProject.Backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service for time entry workflow (draft/submit/approve)
/// </summary>
public class WorkflowService
{
    private readonly IWorkflowRepository _workflowRepo;
    private readonly IFirebirdDataRepository _firebirdRepo;
    private readonly ILogger<WorkflowService> _logger;
    private readonly IConfiguration _configuration;

    public WorkflowService(
        IWorkflowRepository workflowRepo,
        IFirebirdDataRepository firebirdRepo,
        ILogger<WorkflowService> logger,
        IConfiguration configuration)
    {
        _workflowRepo = workflowRepo;
        _firebirdRepo = firebirdRepo;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Save time entry as draft (user can still edit)
    /// </summary>
    public async Task<DraftResponse> SaveDraftAsync(int medewGcId, SaveDraftRequest request)
    {
        _logger.LogInformation(
            "SaveDraft for employee {MedewGcId}, date {Datum}, task {TaakGcId}",
            medewGcId, request.Datum, request.TaakGcId);

        var warnings = new List<string>();

        // Validate employee exists
        if (!await _firebirdRepo.IsMedewActiveAsync(medewGcId))
        {
            return new DraftResponse
            {
                Success = false,
                Message = "Employee not found or inactive"
            };
        }

        // Validate task exists
        if (!await _firebirdRepo.IsValidTaakAsync(request.TaakGcId))
        {
            return new DraftResponse
            {
                Success = false,
                Message = $"Invalid task ID: {request.TaakGcId}"
            };
        }

        // Validate project if provided
        if (request.WerkGcId.HasValue && !await _firebirdRepo.IsValidWerkAsync(request.WerkGcId.Value))
        {
            return new DraftResponse
            {
                Success = false,
                Message = $"Invalid project ID: {request.WerkGcId}"
            };
        }

        // Validate period
        var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);
        if (!await _firebirdRepo.IsValidUrenperAsync(request.UrenperGcId, adminisGcId))
        {
            return new DraftResponse
            {
                Success = false,
                Message = $"Invalid period ID: {request.UrenperGcId}"
            };
        }

        // Check for duplicate (will update if exists)
        var duplicate = await _workflowRepo.FindDuplicateAsync(
            medewGcId,
            request.Datum,
            request.TaakGcId,
            request.WerkGcId,
            request.UrenperGcId);

        if (duplicate != null)
        {
            warnings.Add($"Updated existing entry for {request.Datum:yyyy-MM-dd}");
        }

        // Save draft
        var entry = new TimeEntryWorkflow
        {
            MedewGcId = medewGcId,
            UrenperGcId = request.UrenperGcId,
            TaakGcId = request.TaakGcId,
            WerkGcId = request.WerkGcId,
            Datum = request.Datum,
            Aantal = request.Aantal,
            Omschrijving = request.Omschrijving
        };

        var saved = await _workflowRepo.SaveDraftAsync(entry);

        _logger.LogInformation(
            "Draft saved: ID={Id}, Employee={MedewGcId}, Date={Datum}, Hours={Hours}",
            saved.Id, medewGcId, request.Datum, request.Aantal);

        return new DraftResponse
        {
            Success = true,
            Message = duplicate != null ? "Draft updated" : "Draft saved",
            Entry = await MapToDto(saved),
            Warnings = warnings
        };
    }

    /// <summary>
    /// Get all drafts for an employee
    /// </summary>
    public async Task<WorkflowEntriesResponse> GetDraftsAsync(int medewGcId, int urenperGcId)
    {
        var entries = await _workflowRepo.GetDraftsByEmployeeAsync(medewGcId, urenperGcId);
        var dtos = await MapToDtos(entries);

        return new WorkflowEntriesResponse
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = dtos.Sum(e => e.Aantal)
        };
    }

    /// <summary>
    /// Get submitted entries for an employee
    /// </summary>
    public async Task<WorkflowEntriesResponse> GetSubmittedAsync(int medewGcId, int urenperGcId)
    {
        var entries = await _workflowRepo.GetSubmittedByEmployeeAsync(medewGcId, urenperGcId);
        var dtos = await MapToDtos(entries);

        return new WorkflowEntriesResponse
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = dtos.Sum(e => e.Aantal)
        };
    }

    /// <summary>
    /// Get rejected entries for an employee (need revision)
    /// </summary>
    public async Task<WorkflowEntriesResponse> GetRejectedAsync(int medewGcId, int urenperGcId)
    {
        var entries = await _workflowRepo.GetRejectedByEmployeeAsync(medewGcId, urenperGcId);
        var dtos = await MapToDtos(entries);

        return new WorkflowEntriesResponse
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = dtos.Sum(e => e.Aantal)
        };
    }

    /// <summary>
    /// Submit draft entries (user finishes, awaits manager approval)
    /// </summary>
    public async Task<WorkflowResponse> SubmitEntriesAsync(int medewGcId, SubmitTimeEntriesRequest request)
    {
        _logger.LogInformation(
            "SubmitEntries for employee {MedewGcId}, {Count} entries",
            medewGcId, request.EntryIds.Count);

        var entries = await _workflowRepo.GetByIdsAsync(request.EntryIds);
        var errors = new List<string>();

        // Validate all entries belong to this employee and are drafts
        foreach (var entry in entries)
        {
            if (entry.MedewGcId != medewGcId)
            {
                errors.Add($"Entry {entry.Id} does not belong to employee {medewGcId}");
            }
            else if (entry.Status != "DRAFT")
            {
                errors.Add($"Entry {entry.Id} is not a draft (status: {entry.Status})");
            }
        }

        if (errors.Any())
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = "Validation failed",
                Errors = errors
            };
        }

        // Update all to SUBMITTED
        var now = DateTime.UtcNow;
        foreach (var entry in entries)
        {
            entry.Status = "SUBMITTED";
            entry.SubmittedAt = now;
        }

        await _workflowRepo.UpdateEntriesAsync(entries);

        _logger.LogInformation(
            "Submitted {Count} entries for employee {MedewGcId}",
            entries.Count, medewGcId);

        return new WorkflowResponse
        {
            Success = true,
            Message = $"{entries.Count} entries submitted for review",
            ProcessedCount = entries.Count
        };
    }

    /// <summary>
    /// Get all submitted entries for manager review
    /// </summary>
    public async Task<WorkflowEntriesResponse> GetAllSubmittedForReviewAsync(int urenperGcId)
    {
        var entries = await _workflowRepo.GetAllSubmittedAsync(urenperGcId);
        var dtos = await MapToDtos(entries);

        return new WorkflowEntriesResponse
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = dtos.Sum(e => e.Aantal)
        };
    }

    /// <summary>
    /// Manager approves/rejects time entries
    /// </summary>
    public async Task<WorkflowResponse> ReviewEntriesAsync(int reviewerMedewGcId, ReviewTimeEntriesRequest request)
    {
        _logger.LogInformation(
            "ReviewEntries by manager {ReviewerId}, {Count} entries, approve={Approve}",
            reviewerMedewGcId, request.EntryIds.Count, request.Approve);

        var entries = await _workflowRepo.GetByIdsAsync(request.EntryIds);
        var errors = new List<string>();

        // Validate all entries are submitted
        foreach (var entry in entries)
        {
            if (entry.Status != "SUBMITTED")
            {
                errors.Add($"Entry {entry.Id} is not submitted (status: {entry.Status})");
            }
        }

        if (errors.Any())
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = "Validation failed",
                Errors = errors
            };
        }

        var now = DateTime.UtcNow;

        if (request.Approve)
        {
            // Approve: Copy to Firebird and mark as APPROVED
            var processedCount = 0;

            foreach (var entry in entries)
            {
                try
                {
                    // Insert into Firebird AT_URENBREG
                    var firebirdGcId = await InsertIntoFirebirdAsync(entry);

                    entry.Status = "APPROVED";
                    entry.ReviewedAt = now;
                    entry.ReviewedBy = reviewerMedewGcId;
                    entry.FirebirdGcId = firebirdGcId;

                    processedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to approve entry {Id}", entry.Id);
                    errors.Add($"Entry {entry.Id}: {ex.Message}");
                }
            }

            await _workflowRepo.UpdateEntriesAsync(entries);

            _logger.LogInformation(
                "Approved {Count} entries by manager {ReviewerId}",
                processedCount, reviewerMedewGcId);

            return new WorkflowResponse
            {
                Success = errors.Count == 0,
                Message = errors.Count == 0
                    ? $"{processedCount} entries approved"
                    : $"{processedCount} approved, {errors.Count} failed",
                ProcessedCount = processedCount,
                Errors = errors
            };
        }
        else
        {
            // Reject: Mark as REJECTED so user can revise
            foreach (var entry in entries)
            {
                entry.Status = "REJECTED";
                entry.ReviewedAt = now;
                entry.ReviewedBy = reviewerMedewGcId;
                entry.RejectionReason = request.RejectionReason;
            }

            await _workflowRepo.UpdateEntriesAsync(entries);

            _logger.LogInformation(
                "Rejected {Count} entries by manager {ReviewerId}",
                entries.Count, reviewerMedewGcId);

            return new WorkflowResponse
            {
                Success = true,
                Message = $"{entries.Count} entries rejected",
                ProcessedCount = entries.Count
            };
        }
    }

    /// <summary>
    /// Resubmit rejected entries after user revision
    /// </summary>
    public async Task<WorkflowResponse> ResubmitRejectedEntriesAsync(int medewGcId, SubmitTimeEntriesRequest request)
    {
        _logger.LogInformation(
            "ResubmitRejected for employee {MedewGcId}, {Count} entries",
            medewGcId, request.EntryIds.Count);

        var entries = await _workflowRepo.GetByIdsAsync(request.EntryIds);
        var errors = new List<string>();

        // Validate all entries belong to this employee and are rejected
        foreach (var entry in entries)
        {
            if (entry.MedewGcId != medewGcId)
            {
                errors.Add($"Entry {entry.Id} does not belong to employee {medewGcId}");
            }
            else if (entry.Status != "REJECTED")
            {
                errors.Add($"Entry {entry.Id} is not rejected (status: {entry.Status})");
            }
        }

        if (errors.Any())
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = "Validation failed",
                Errors = errors
            };
        }

        // Update all to SUBMITTED
        var now = DateTime.UtcNow;
        foreach (var entry in entries)
        {
            entry.Status = "SUBMITTED";
            entry.SubmittedAt = now;
            entry.RejectionReason = null; // Clear rejection reason
        }

        await _workflowRepo.UpdateEntriesAsync(entries);

        _logger.LogInformation(
            "Resubmitted {Count} rejected entries for employee {MedewGcId}",
            entries.Count, medewGcId);

        return new WorkflowResponse
        {
            Success = true,
            Message = $"{entries.Count} entries resubmitted for review",
            ProcessedCount = entries.Count
        };
    }

    /// <summary>
    /// Delete a draft entry
    /// </summary>
    public async Task<WorkflowResponse> DeleteDraftAsync(int medewGcId, int entryId)
    {
        var entry = await _workflowRepo.GetByIdAsync(entryId);

        if (entry == null)
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = "Entry not found"
            };
        }

        if (entry.MedewGcId != medewGcId)
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = "Entry does not belong to this employee"
            };
        }

        if (entry.Status != "DRAFT")
        {
            return new WorkflowResponse
            {
                Success = false,
                Message = $"Cannot delete entry with status {entry.Status}"
            };
        }

        await _workflowRepo.DeleteAsync(entryId);

        return new WorkflowResponse
        {
            Success = true,
            Message = "Draft deleted",
            ProcessedCount = 1
        };
    }

    /// <summary>
    /// Insert approved entry into Firebird AT_URENBREG
    /// </summary>
    private async Task<int> InsertIntoFirebirdAsync(TimeEntryWorkflow entry)
    {
        // This uses the existing TimeEntryService logic to insert into Firebird
        // We need to create a document if it doesn't exist, get urenstat, and insert the entry

        var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);

        using var connection = _firebirdRepo.GetConnection();
        await connection.OpenAsync();
        using var transaction = await connection.BeginTransactionAsync();

        try
        {
            // Get or create document
            var documentGcId = await _firebirdRepo.GetDocumentGcIdAsync(
                entry.MedewGcId,
                entry.UrenperGcId,
                adminisGcId);

            if (!documentGcId.HasValue)
            {
                var boekDatum = await _firebirdRepo.GetPeriodBeginDateAsync(entry.UrenperGcId) ?? DateTime.Today;
                documentGcId = await _firebirdRepo.CreateDocumentAsync(
                    entry.MedewGcId,
                    adminisGcId,
                    boekDatum,
                    entry.UrenperGcId,
                    transaction);
            }

            // Ensure urenstat exists
            await _firebirdRepo.EnsureUrenstatAsync(
                documentGcId.Value,
                entry.MedewGcId,
                entry.UrenperGcId,
                transaction);

            // Get next regel number
            var regelNr = await _firebirdRepo.GetNextRegelNrAsync(documentGcId.Value, transaction);

            // Insert time entry
            var timeEntry = new ClockwiseProject.Backend.Models.TimeEntry
            {
                DocumentGcId = documentGcId.Value,
                TaakGcId = entry.TaakGcId,
                WerkGcId = entry.WerkGcId,
                MedewGcId = entry.MedewGcId,
                GcRegelNr = regelNr,
                GcOmschrijving = entry.Omschrijving,
                Aantal = entry.Aantal,
                Datum = entry.Datum
            };

            await _firebirdRepo.InsertTimeEntryAsync(timeEntry, transaction);

            await transaction.CommitAsync();

            _logger.LogInformation(
                "Inserted approved entry into Firebird: Document={DocumentGcId}, Regel={RegelNr}",
                documentGcId.Value, regelNr);

            return documentGcId.Value;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Map entity to DTO with enriched Firebird data
    /// </summary>
    private async Task<WorkflowEntryDto> MapToDto(TimeEntryWorkflow entry)
    {
        var dto = new WorkflowEntryDto
        {
            Id = entry.Id,
            MedewGcId = entry.MedewGcId,
            UrenperGcId = entry.UrenperGcId,
            TaakGcId = entry.TaakGcId,
            WerkGcId = entry.WerkGcId,
            Datum = entry.Datum,
            Aantal = entry.Aantal,
            Omschrijving = entry.Omschrijving,
            Status = entry.Status,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt,
            SubmittedAt = entry.SubmittedAt,
            ReviewedAt = entry.ReviewedAt,
            ReviewedBy = entry.ReviewedBy,
            RejectionReason = entry.RejectionReason,
            FirebirdGcId = entry.FirebirdGcId
        };

        // Enrich with Firebird data (task/project names)
        try
        {
            var taakCode = await _firebirdRepo.GetTaakCodeAsync(entry.TaakGcId);
            dto.TaakCode = taakCode;

            if (entry.WerkGcId.HasValue)
            {
                var werkCode = await _firebirdRepo.GetWerkCodeAsync(entry.WerkGcId.Value);
                dto.WerkCode = werkCode;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enrich entry {Id} with Firebird data", entry.Id);
        }

        return dto;
    }

    private async Task<List<WorkflowEntryDto>> MapToDtos(List<TimeEntryWorkflow> entries)
    {
        var dtos = new List<WorkflowEntryDto>();
        foreach (var entry in entries)
        {
            dtos.Add(await MapToDto(entry));
        }
        return dtos;
    }
}
