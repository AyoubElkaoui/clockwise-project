using backend.Models;
using backend.Repositories;

namespace backend.Services;

/// <summary>
/// Service voor leave/vacation operaties.
/// </summary>
public class LeaveService
{
    private readonly ITaskRepository _taskRepository;
    private readonly ITimeEntryRepository _timeEntryRepository;
    private readonly ILogger<LeaveService> _logger;

    public LeaveService(
        ITaskRepository taskRepository,
        ITimeEntryRepository timeEntryRepository,
        ILogger<LeaveService> logger)
    {
        _taskRepository = taskRepository;
        _timeEntryRepository = timeEntryRepository;
        _logger = logger;
    }

    /// <summary>
    /// Haalt alle leave types op (taken met code Z*).
    /// Classificeert ze applicatiezijde.
    /// </summary>
    public async Task<List<LeaveTypeDto>> GetLeaveTypesAsync(bool includeHistorical = false)
    {
        _logger.LogInformation("Fetching leave types (includeHistorical={IncludeHistorical})", includeHistorical);

        var tasks = await _taskRepository.GetLeaveTasksAsync(includeHistorical);

        var leaveTypes = tasks.Select(t => new LeaveTypeDto
        {
            Id = t.Id,
            Code = t.Code,
            Description = t.Description,
            ShortName = t.ShortName,
            IsHistorical = t.IsHistorical,
            Category = LeaveTypeClassifier.GetCategory(t.Code, t.Description)
        }).ToList();

        _logger.LogInformation("Found {Count} leave types", leaveTypes.Count);

        return leaveTypes;
    }

    /// <summary>
    /// Haalt leave bookings op voor een medewerker.
    /// </summary>
    public async Task<MyLeaveResponse> GetLeaveBookingsAsync(
        int medewGcId,
        DateTime fromDate,
        DateTime toDate)
    {
        _logger.LogInformation(
            "Fetching leave bookings for employee {MedewGcId} from {FromDate} to {ToDate}",
            medewGcId, fromDate, toDate);

        var bookings = await _timeEntryRepository.GetLeaveBookingsByEmployeeAsync(
            medewGcId,
            fromDate,
            toDate);

        // Classificeer categorieën
        foreach (var booking in bookings)
        {
            booking.Category = LeaveTypeClassifier.GetCategory(booking.TaskCode, booking.TaskDescription);
        }

        var totalHours = bookings.Sum(b => b.Hours);

        _logger.LogInformation(
            "Found {Count} leave bookings totaling {TotalHours} hours for employee {MedewGcId}",
            bookings.Count, totalHours, medewGcId);

        return new MyLeaveResponse
        {
            Bookings = bookings,
            TotalHours = totalHours
        };
    }

    /// <summary>
    /// Boekt verlof/vakantie.
    /// </summary>
    public async Task<BookLeaveResponse> BookLeaveAsync(
        BookLeaveRequest request,
        int medewGcId)
    {
        _logger.LogInformation(
            "Booking leave for employee {MedewGcId}, task {TaskId}, {EntryCount} entries",
            medewGcId, request.TaskId, request.Entries.Count);

        // Valideer
        var validation = await ValidateBookLeaveRequestAsync(request, medewGcId);
        if (!validation.IsValid)
        {
            _logger.LogWarning(
                "Leave booking validation failed for employee {MedewGcId}: {Errors}",
                medewGcId, string.Join("; ", validation.Errors));

            return new BookLeaveResponse
            {
                Success = false,
                Message = string.Join("; ", validation.Errors)
            };
        }

        // Insert entries
        var createdIds = new List<int>();

        try
        {
            foreach (var entry in request.Entries)
            {
                var command = new CreateTimeEntryCommand
                {
                    MedewGcId = medewGcId,
                    TaakGcId = request.TaskId,
                    WerkGcId = null,  // Leave heeft geen project
                    Datum = entry.Date,
                    Uren = entry.Hours,
                    Omschrijving = entry.Description
                };

                var gcId = await _timeEntryRepository.CreateAsync(command);
                createdIds.Add(gcId);
            }

            _logger.LogInformation(
                "Successfully booked {Count} leave entries for employee {MedewGcId}, created IDs: {Ids}",
                createdIds.Count, medewGcId, string.Join(", ", createdIds));

            return new BookLeaveResponse
            {
                Success = true,
                CreatedBookingIds = createdIds,
                Message = $"Successfully booked {createdIds.Count} leave entries",
                Warnings = validation.Warnings
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error booking leave for employee {MedewGcId}", medewGcId);

            return new BookLeaveResponse
            {
                Success = false,
                Message = $"Error booking leave: {ex.Message}"
            };
        }
    }

    /// <summary>
    /// Valideert een leave booking request.
    /// </summary>
    private async Task<ValidationResult> ValidateBookLeaveRequestAsync(
        BookLeaveRequest request,
        int medewGcId)
    {
        var errors = new List<string>();
        var warnings = new List<string>();

        // 1. Valideer dat medewerker actief is
        var isActive = await _timeEntryRepository.IsEmployeeActiveAsync(medewGcId);
        if (!isActive)
        {
            errors.Add($"Employee with ID {medewGcId} does not exist or is not active");
            return ValidationResult.Fail(errors);
        }

        // 2. Valideer dat taak bestaat
        var task = await _taskRepository.GetByIdAsync(request.TaskId);
        if (task == null)
        {
            errors.Add($"Task with ID {request.TaskId} does not exist");
            return ValidationResult.Fail(errors);
        }

        // 3. Waarschuw als taak historisch is (niet blokkeren)
        if (task.IsHistorical)
        {
            warnings.Add($"Warning: Task '{task.Code}' is marked as historical");
        }

        // 4. Waarschuw als taak geen leave taak is
        if (!LeaveTypeClassifier.IsLeaveTask(task.Code))
        {
            warnings.Add($"Warning: Task '{task.Code}' is not a standard leave task (does not start with Z)");
        }

        // 5. Valideer entries
        if (!request.Entries.Any())
        {
            errors.Add("At least one entry is required");
        }

        foreach (var entry in request.Entries)
        {
            // Valideer uren range
            if (entry.Hours <= 0 || entry.Hours > 24)
            {
                errors.Add($"Invalid hours {entry.Hours} for date {entry.Date:yyyy-MM-dd}. Must be between 0.1 and 24.");
            }

            // Check dubbele boekingen op zelfde taak en datum
            var existing = await _timeEntryRepository.GetByEmployeeAndDateAsync(medewGcId, entry.Date);
            var duplicates = existing.Where(e => e.TaakGcId == request.TaskId).ToList();

            if (duplicates.Any())
            {
                errors.Add($"Hours already booked on task '{task.Code}' for date {entry.Date:yyyy-MM-dd}");
            }
        }

        return errors.Any()
            ? ValidationResult.Fail(errors, warnings)
            : ValidationResult.Success(warnings);
    }
}

/// <summary>
/// Validation result helper.
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();

    public static ValidationResult Success(List<string>? warnings = null)
    {
        return new ValidationResult
        {
            IsValid = true,
            Warnings = warnings ?? new List<string>()
        };
    }

    public static ValidationResult Fail(List<string> errors, List<string>? warnings = null)
    {
        return new ValidationResult
        {
            IsValid = false,
            Errors = errors,
            Warnings = warnings ?? new List<string>()
        };
    }
}
