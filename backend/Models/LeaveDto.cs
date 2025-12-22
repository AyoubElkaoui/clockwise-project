using System.ComponentModel.DataAnnotations;

namespace backend.Models;

// DTOs voor leave/vacation module

public class LeaveTypeDto
{
    public int Id { get; set; }              // GC_ID
    public string Code { get; set; }         // GC_CODE
    public string Description { get; set; }  // GC_OMSCHRIJVING
    public string? ShortName { get; set; }   // GC_KORTE_NAAM
    public bool IsHistorical { get; set; }   // GC_HISTORISCH_JN == 'J'
    public string Category { get; set; }     // "VACATION" / "SICK_LEAVE" / etc.
}

public class LeaveTypesResponse
{
    public List<LeaveTypeDto> LeaveTypes { get; set; } = new();
    public int TotalCount { get; set; }
}

public class GetLeaveTypesQuery
{
    public bool IncludeHistorical { get; set; } = false;
}

public class LeaveBookingDto
{
    public int BookingId { get; set; }         // AT_URENBREG.GC_ID
    public DateTime Date { get; set; }         // AT_URENBREG.GC_DATUM
    public decimal Hours { get; set; }         // AT_URENBREG.GC_UREN
    public string? Description { get; set; }   // AT_URENBREG.GC_OMSCHRIJVING

    public int TaskId { get; set; }            // AT_TAAK.GC_ID
    public string TaskCode { get; set; }       // AT_TAAK.GC_CODE
    public string TaskDescription { get; set; } // AT_TAAK.GC_OMSCHRIJVING
    public string Category { get; set; }       // Berekend applicatiezijde
}

public class MyLeaveResponse
{
    public List<LeaveBookingDto> Bookings { get; set; } = new();
    public decimal TotalHours { get; set; }
}

public class GetMyLeaveQuery
{
    [Required]
    public DateTime From { get; set; }

    [Required]
    public DateTime To { get; set; }
}

public class BookLeaveRequest
{
    [Required]
    public int TaskId { get; set; }  // GC_ID van AT_TAAK

    [Required]
    public List<LeaveBookingEntry> Entries { get; set; } = new();
}

public class LeaveBookingEntry
{
    [Required]
    public DateTime Date { get; set; }

    [Required]
    [Range(0.1, 24)]
    public decimal Hours { get; set; }

    public string? Description { get; set; }  // Optioneel
}

public class BookLeaveResponse
{
    public bool Success { get; set; }
    public List<int> CreatedBookingIds { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    public List<string> Warnings { get; set; } = new();
}
