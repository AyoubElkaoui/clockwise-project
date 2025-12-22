using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Repository voor AT_URENBREG operaties (time entries / hour registrations).
/// </summary>
public interface ITimeEntryRepository
{
    /// <summary>
    /// Haalt time entries op voor een medewerker binnen een datumrange.
    /// </summary>
    Task<List<TimeEntryDetailDto>> GetByEmployeeAndDateRangeAsync(
        int medewGcId,
        DateTime fromDate,
        DateTime toDate);

    /// <summary>
    /// Haalt leave bookings op voor een medewerker binnen een datumrange.
    /// Filtert op taken met GC_CODE STARTING WITH 'Z'.
    /// </summary>
    Task<List<LeaveBookingDto>> GetLeaveBookingsByEmployeeAsync(
        int medewGcId,
        DateTime fromDate,
        DateTime toDate);

    /// <summary>
    /// Haalt time entries op voor een specifieke datum (voor duplicate check).
    /// </summary>
    Task<List<TimeEntryDetailDto>> GetByEmployeeAndDateAsync(
        int medewGcId,
        DateTime date);

    /// <summary>
    /// Maakt een nieuwe time entry aan in AT_URENBREG.
    /// Gebruikt Firebird sequence voor GC_ID.
    /// </summary>
    Task<int> CreateAsync(CreateTimeEntryCommand command);

    /// <summary>
    /// Controleert of een medewerker actief is.
    /// </summary>
    Task<bool> IsEmployeeActiveAsync(int medewGcId);
}

/// <summary>
/// Command voor het aanmaken van een time entry.
/// </summary>
public class CreateTimeEntryCommand
{
    public int MedewGcId { get; set; }
    public int TaakGcId { get; set; }
    public int? WerkGcId { get; set; }  // NULL voor leave/vacation
    public DateTime Datum { get; set; }
    public decimal Uren { get; set; }
    public string? Omschrijving { get; set; }
    public int? DocumentGcId { get; set; }  // Optioneel: link naar URS document
}

/// <summary>
/// Gedetailleerde time entry info.
/// </summary>
public class TimeEntryDetailDto
{
    public int BookingId { get; set; }      // GC_ID
    public int MedewGcId { get; set; }
    public int TaakGcId { get; set; }
    public int? WerkGcId { get; set; }
    public DateTime Datum { get; set; }
    public decimal Uren { get; set; }
    public string? Omschrijving { get; set; }
    public string? TaskCode { get; set; }
    public string? TaskDescription { get; set; }
}
