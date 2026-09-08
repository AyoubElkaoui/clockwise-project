using ClockwiseProject.Backend.Models;
using backend.Models;
using backend.Repositories;
using ClockwiseProject.Backend.Repositories;
using Dapper;
using System.Data;

namespace backend.Services;

/// <summary>
/// Service for time entry workflow (draft/submit/approve)
/// </summary>
public class WorkflowService
{
    private readonly IWorkflowRepository _workflowRepo;
    private readonly IFirebirdDataRepository _firebirdRepo;
    private readonly IDbConnection _db;
    private readonly ILogger<WorkflowService> _logger;
    private readonly SyntessOptions _syntess;

    public WorkflowService(
        IWorkflowRepository workflowRepo,
        IFirebirdDataRepository firebirdRepo,
        IDbConnection db,
        ILogger<WorkflowService> logger,
        SyntessOptions syntess)
    {
        _workflowRepo = workflowRepo;
        _firebirdRepo = firebirdRepo;
        _db = db;
        _logger = logger;
        _syntess = syntess;
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
        var adminisGcId = _syntess.AdminisGcId;
        if (!await _firebirdRepo.IsValidUrenperAsync(request.UrenperGcId, adminisGcId))
        {
            return new DraftResponse
            {
                Success = false,
                Message = $"Invalid period ID: {request.UrenperGcId}"
            };
        }

        // Check hour allocation budget for this task code
        var taakCode = await _firebirdRepo.GetTaakCodeAsync(request.TaakGcId);
        if (_syntess.IsBudgetTaskCode(taakCode))
        {
            try
            {
                var userId = await _db.QueryFirstOrDefaultAsync<int?>(
                    "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                    new { MedewGcId = medewGcId });

                if (userId.HasValue)
                {
                    var year = request.Datum.Year;
                    var allocation = await _db.QueryFirstOrDefaultAsync<dynamic>(
                        @"SELECT annual_budget, used FROM user_hour_allocations
                          WHERE user_id = @UserId AND task_code = @TaskCode AND year = @Year",
                        new { UserId = userId.Value, TaskCode = taakCode!.Trim(), Year = year });

                    if (allocation != null && (decimal)(allocation!.annual_budget ?? 0m) > 0)
                    {
                        var budget = (decimal)(allocation!.annual_budget ?? 0m);
                        var alreadyUsed = (decimal)(allocation!.used ?? 0m);
                        var newHours = request.Aantal;

                        // If updating existing entry, subtract old hours
                        if (request.Id.HasValue && request.Id.Value > 0)
                        {
                            var existingEntry = await _workflowRepo.GetByIdAsync(request.Id.Value);
                            if (existingEntry != null)
                                newHours -= existingEntry.Aantal;
                        }

                        if (alreadyUsed + newHours > budget)
                        {
                            var remaining = budget - alreadyUsed;
                            return new DraftResponse
                            {
                                Success = false,
                                Message = $"Budget overschreden voor {taakCode.Trim()}: {remaining:F1} van {budget:F1} resterend"
                            };
                        }

                        warnings.Add($"Budget {taakCode.Trim()}: {alreadyUsed + newHours:F1}/{budget:F1} gebruikt");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not check hour allocation budget for task {TaskCode}", taakCode);
                // Don't block the save if budget check fails
            }
        }

        // Check if we're updating an existing entry (ID provided) or creating new
        TimeEntryWorkflow? duplicate = null;

        if (request.Id.HasValue && request.Id.Value > 0)
        {
            // Frontend provided an ID - update that specific entry
            duplicate = await _workflowRepo.GetByIdAsync(request.Id.Value);
            if (duplicate != null)
            {
                warnings.Add($"Updated existing entry for {request.Datum:yyyy-MM-dd}");
            }
        }
        else
        {
            // No ID provided - check for duplicate by date/project/task
            duplicate = await _workflowRepo.FindDuplicateAsync(
                medewGcId,
                request.Datum,
                request.TaakGcId,
                request.WerkGcId,
                request.UrenperGcId);

            if (duplicate != null)
            {
                warnings.Add($"Updated existing entry for {request.Datum:yyyy-MM-dd}");
            }
        }

        // Save draft (update if duplicate found, create new if not)
        var entry = new TimeEntryWorkflow
        {
            Id = duplicate?.Id ?? 0, // Use existing ID if updating
            MedewGcId = medewGcId,
            UrenperGcId = request.UrenperGcId,
            TaakGcId = request.TaakGcId,
            WerkGcId = request.WerkGcId,
            Datum = request.Datum,
            Aantal = request.Aantal,
            Omschrijving = request.Omschrijving,
            EveningNightHours = request.EveningNightHours,
            TravelHours = request.TravelHours,
            DistanceKm = request.DistanceKm,
            TravelCosts = request.TravelCosts,
            OtherExpenses = request.OtherExpenses
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
    /// <summary>Alle regels van de medewerker in een datumbereik, verrijkt met taak/werk-info.</summary>
    public async Task<WorkflowEntriesResponse> GetMineAsync(int medewGcId, DateTime from, DateTime to)
    {
        var entries = await _workflowRepo.GetByEmployeeAndDateRangeAsync(medewGcId, from, to);
        var dtos = await MapToDtos(entries);
        return new WorkflowEntriesResponse { Entries = dtos, TotalCount = dtos.Count, TotalHours = dtos.Sum(e => e.Aantal) };
    }

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
    public async Task<WorkflowEntriesResponse> GetAllSubmittedForReviewAsync(int urenperGcId, int? managerMedewGcId = null)
    {
        var entries = await _workflowRepo.GetAllSubmittedAsync(urenperGcId, managerMedewGcId);
        var dtos = await MapToDtos(entries);

        return new WorkflowEntriesResponse
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = dtos.Sum(e => e.Aantal)
        };
    }

    /// <summary>
    /// Get all entries for a period (manager overview, all statuses)
    /// </summary>
    public async Task<WorkflowEntriesResponse> GetAllEntriesByPeriodAsync(int urenperGcId, string? status = null)
    {
        var entries = await _workflowRepo.GetAllByPeriodAsync(urenperGcId, status);
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
            // Approve: claim the row in Postgres FIRST (SUBMITTED -> APPROVING), then copy to
            // Firebird, then finalize (APPROVING -> APPROVED). Two concurrent approvals of the
            // same entry can therefore never both reach the Firebird insert.
            var processedCount = 0;

            foreach (var entry in entries)
            {
                if (!await _workflowRepo.TryClaimForApprovalAsync(entry.Id))
                {
                    _logger.LogWarning(
                        "Entry {Id} skipped: not in SUBMITTED anymore (already approved/rejected or being approved by another request)",
                        entry.Id);
                    errors.Add($"Entry {entry.Id}: overgeslagen - is niet (meer) ingediend, mogelijk al verwerkt door een andere beoordeling");
                    continue;
                }

                try
                {
                    // Insert into Firebird AT_URENBREG
                    var firebirdGcId = await InsertIntoFirebirdAsync(entry);

                    // Persist THIS entry's approved state right after its Firebird commit, so a
                    // crash cannot leave it SUBMITTED and trigger a re-insert (double payment).
                    var rows = await _workflowRepo.MarkApprovedAsync(entry.Id, reviewerMedewGcId, now, firebirdGcId);
                    if (rows == 0)
                    {
                        // Firebird committed but the claim disappeared underneath us; the Firebird
                        // idempotency guard makes a later re-approval safe, so only report it.
                        _logger.LogError(
                            "Entry {Id}: Firebird insert committed but status could not be finalized (claim lost)",
                            entry.Id);
                        errors.Add($"Entry {entry.Id}: geboekt in Syntess maar status kon niet worden bijgewerkt - controleer handmatig");
                        continue;
                    }

                    entry.Status = "APPROVED";
                    entry.ReviewedAt = now;
                    entry.ReviewedBy = reviewerMedewGcId;
                    entry.FirebirdGcId = firebirdGcId;

                    // Update hour allocation 'used' for budget task codes
                    await UpdateHourAllocationUsedAsync(entry);

                    processedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to approve entry {Id}", entry.Id);
                    errors.Add($"Entry {entry.Id}: {ex.Message}");

                    try
                    {
                        await _workflowRepo.ReleaseApprovalClaimAsync(entry.Id);
                    }
                    catch (Exception releaseEx)
                    {
                        _logger.LogError(releaseEx, "Entry {Id} stays in APPROVING: could not release claim", entry.Id);
                    }
                }
            }

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
            // Reject: Mark as REJECTED so user can revise (only when still SUBMITTED)
            var rejectedCount = 0;
            foreach (var entry in entries)
            {
                var rows = await _workflowRepo.MarkRejectedAsync(entry.Id, reviewerMedewGcId, now, request.RejectionReason);
                if (rows == 0)
                {
                    errors.Add($"Entry {entry.Id}: overgeslagen - is niet (meer) ingediend, mogelijk al verwerkt door een andere beoordeling");
                    continue;
                }
                rejectedCount++;
            }

            _logger.LogInformation(
                "Rejected {Count} entries by manager {ReviewerId}",
                rejectedCount, reviewerMedewGcId);

            return new WorkflowResponse
            {
                Success = errors.Count == 0,
                Message = errors.Count == 0
                    ? $"{rejectedCount} entries rejected"
                    : $"{rejectedCount} rejected, {errors.Count} skipped",
                ProcessedCount = rejectedCount,
                Errors = errors
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
            _logger.LogWarning("DELETE entry {Id}: NOT FOUND", entryId);
            return new WorkflowResponse
            {
                Success = false,
                Message = "Entry not found"
            };
        }

        _logger.LogInformation("DELETE entry {Id}: found with Status={Status}, MedewGcId={EntryMedew}, requesting MedewGcId={ReqMedew}",
            entryId, entry.Status, entry.MedewGcId, medewGcId);

        if (entry.MedewGcId != medewGcId)
        {
            _logger.LogWarning("DELETE entry {Id}: OWNER MISMATCH - entry belongs to {EntryMedew}, request from {ReqMedew}",
                entryId, entry.MedewGcId, medewGcId);
            return new WorkflowResponse
            {
                Success = false,
                Message = $"Entry belongs to employee {entry.MedewGcId}, not {medewGcId}"
            };
        }

        if (entry.Status == "APPROVED")
        {
            _logger.LogWarning("DELETE entry {Id}: BLOCKED - status is APPROVED", entryId);
            return new WorkflowResponse
            {
                Success = false,
                Message = "Cannot delete approved entries"
            };
        }

        if (entry.Status == "SUBMITTED")
        {
            _logger.LogWarning("DELETE entry {Id}: BLOCKED - status is SUBMITTED", entryId);
            return new WorkflowResponse
            {
                Success = false,
                Message = "Cannot delete submitted entries - they are awaiting approval"
            };
        }

        await _workflowRepo.DeleteAsync(entryId);
        _logger.LogInformation("DELETE entry {Id}: SUCCESS - deleted from database", entryId);

        return new WorkflowResponse
        {
            Success = true,
            Message = "Draft deleted",
            ProcessedCount = 1
        };
    }

    /// <summary>
    /// Update the 'used' field in user_hour_allocations when an entry is approved
    /// </summary>
    private async Task UpdateHourAllocationUsedAsync(TimeEntryWorkflow entry)
    {
        try
        {
            var taakCode = await _firebirdRepo.GetTaakCodeAsync(entry.TaakGcId);
            if (!_syntess.IsBudgetTaskCode(taakCode))
                return;

            var userId = await _db.QueryFirstOrDefaultAsync<int?>(
                "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                new { MedewGcId = entry.MedewGcId });

            if (!userId.HasValue) return;

            var year = entry.Datum.Year;
            await _db.ExecuteAsync(
                @"UPDATE user_hour_allocations
                  SET used = used + @Hours, updated_at = CURRENT_TIMESTAMP
                  WHERE user_id = @UserId AND task_code = @TaskCode AND year = @Year",
                new { Hours = entry.Aantal, UserId = userId.Value, TaskCode = taakCode!.Trim(), Year = year });

            _logger.LogInformation(
                "Updated hour allocation used: user={UserId}, task={TaskCode}, +{Hours}h",
                userId.Value, taakCode.Trim(), entry.Aantal);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update hour allocation used for entry {Id}", entry.Id);
        }
    }

    /// <summary>
    /// Insert approved entry into Firebird AT_URENBREG
    /// </summary>
    private async Task<int> InsertIntoFirebirdAsync(TimeEntryWorkflow entry)
    {
        // This uses the existing TimeEntryService logic to insert into Firebird
        // We need to create a document if it doesn't exist, get urenstat, and insert the entry

        var adminisGcId = _syntess.AdminisGcId;

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

            // Idempotency guard: if an identical line is already present in Firebird - e.g.
            // a previous approval committed but crashed before the Postgres status was saved -
            // do NOT insert it again. A duplicate urenregel means a duplicate payment and
            // cannot be undone. Firebird is the source of truth here, so this is crash-safe.
            // The guard uses the FIRST line the insert would produce (regular hours, else travel
            // hours, else km, else travel costs, else other expenses) so it also protects entries
            // without regular hours (reiskosten/km/onkosten only).
            var firstLine = GetFirstFirebirdLine(entry);
            if (firstLine == null)
            {
                await transaction.CommitAsync();
                _logger.LogWarning("Entry {Id} has no bookable amounts - nothing inserted into Firebird", entry.Id);
                return documentGcId.Value;
            }

            if (await _firebirdRepo.IsDuplicateEntryAsync(
                    documentGcId.Value, entry.TaakGcId, entry.WerkGcId,
                    entry.Datum, firstLine.Value.Aantal, firstLine.Value.Omschrijving))
            {
                await transaction.CommitAsync();
                _logger.LogWarning(
                    "Idempotency: identical entry already present in Firebird (medew {Medew}, taak {Taak}, werk {Werk}, {Datum:yyyy-MM-dd}, {Aantal} '{Omschrijving}') - skipping insert to prevent duplicate payment",
                    entry.MedewGcId, entry.TaakGcId, entry.WerkGcId, entry.Datum, firstLine.Value.Aantal, firstLine.Value.Omschrijving);
                return documentGcId.Value;
            }

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
                Datum = entry.Datum,
                EveningNightHours = entry.EveningNightHours,
                TravelHours = entry.TravelHours,
                DistanceKm = entry.DistanceKm,
                TravelCosts = entry.TravelCosts,
                OtherExpenses = entry.OtherExpenses
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
    /// Mirrors the line order/descriptions of FirebirdDataRepository.InsertTimeEntryAsync so the
    /// duplicate guard can match the first AT_URENBREG line an entry produces.
    /// </summary>
    private static (decimal Aantal, string Omschrijving)? GetFirstFirebirdLine(TimeEntryWorkflow entry)
    {
        var regularHours = entry.Aantal + entry.EveningNightHours;
        if (regularHours > 0) return (regularHours, entry.Omschrijving ?? string.Empty);
        if (entry.TravelHours > 0) return (entry.TravelHours, "Reisuren");
        if (entry.DistanceKm > 0) return (entry.DistanceKm, $"{entry.DistanceKm} km");
        if (entry.TravelCosts > 0) return (entry.TravelCosts, $"Reiskosten €{entry.TravelCosts:F2}");
        if (entry.OtherExpenses > 0) return (entry.OtherExpenses, $"Onkosten €{entry.OtherExpenses:F2}");
        return null;
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
            EveningNightHours = entry.EveningNightHours,
            TravelHours = entry.TravelHours,
            DistanceKm = entry.DistanceKm,
            TravelCosts = entry.TravelCosts,
            OtherExpenses = entry.OtherExpenses,
            Status = entry.Status,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt,
            SubmittedAt = entry.SubmittedAt,
            ReviewedAt = entry.ReviewedAt,
            ReviewedBy = entry.ReviewedBy,
            RejectionReason = entry.RejectionReason,
            FirebirdGcId = entry.FirebirdGcId
        };

        // Enrich with Firebird data (employee, task, project names)
        try
        {
            // Get employee name
            using var connection = _firebirdRepo.GetConnection();
            var employeeName = await connection.ExecuteScalarAsync<string>(
                "SELECT GC_OMSCHRIJVING FROM AT_MEDEW WHERE GC_ID = @MedewGcId",
                new { MedewGcId = entry.MedewGcId });
            dto.EmployeeName = employeeName;

            var taakCode = await _firebirdRepo.GetTaakCodeAsync(entry.TaakGcId);
            dto.TaakCode = taakCode;

            if (entry.WerkGcId.HasValue)
            {
                var werkData = await _firebirdRepo.GetWerkDetailsAsync(entry.WerkGcId.Value);
                dto.WerkCode = werkData.Code;
                dto.WerkDescription = werkData.Description;
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
        if (!entries.Any())
            return new List<WorkflowEntryDto>();

        var dtos = new List<WorkflowEntryDto>();
        
        // Open ONE Firebird connection for all entries (huge performance improvement!)
        using var connection = _firebirdRepo.GetConnection();
        await connection.OpenAsync();
        
        try
        {
            // Pre-fetch all unique employee names in ONE query
            var uniqueMedewIds = entries.Select(e => e.MedewGcId).Distinct().ToList();
            var employeeNames = new Dictionary<int, string>();
            if (uniqueMedewIds.Any())
            {
                var medewIdsStr = string.Join(",", uniqueMedewIds);
                var employees = await connection.QueryAsync<(int GC_ID, string GC_OMSCHRIJVING)>(
                    $"SELECT GC_ID, GC_OMSCHRIJVING FROM AT_MEDEW WHERE GC_ID IN ({medewIdsStr})");
                foreach (var emp in employees)
                {
                    employeeNames[emp.GC_ID] = emp.GC_OMSCHRIJVING;
                }
            }

            // Process each entry with pre-fetched data
            foreach (var entry in entries)
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
                    EveningNightHours = entry.EveningNightHours,
                    TravelHours = entry.TravelHours,
                    DistanceKm = entry.DistanceKm,
                    TravelCosts = entry.TravelCosts,
                    OtherExpenses = entry.OtherExpenses,
                    Status = entry.Status,
                    CreatedAt = entry.CreatedAt,
                    UpdatedAt = entry.UpdatedAt,
                    SubmittedAt = entry.SubmittedAt,
                    ReviewedAt = entry.ReviewedAt,
                    ReviewedBy = entry.ReviewedBy,
                    RejectionReason = entry.RejectionReason,
                    FirebirdGcId = entry.FirebirdGcId
                };

                // Use pre-fetched employee name
                if (employeeNames.TryGetValue(entry.MedewGcId, out var empName))
                {
                    dto.EmployeeName = empName;
                }

                // Get task and werk details (these are still individual queries, but fewer total)
                try
                {
                    dto.TaakCode = await _firebirdRepo.GetTaakCodeAsync(entry.TaakGcId);
                    
                    if (entry.WerkGcId.HasValue)
                    {
                        var werkData = await _firebirdRepo.GetWerkDetailsAsync(entry.WerkGcId.Value);
                        dto.WerkCode = werkData.Code;
                        dto.WerkDescription = werkData.Description;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to enrich entry {Id} with Firebird data", entry.Id);
                }

                dtos.Add(dto);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error mapping entries to DTOs");
        }
        
        return dtos;
    }
}
