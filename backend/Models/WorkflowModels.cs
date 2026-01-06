using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

/// <summary>
/// Time entry workflow statuses
/// </summary>
public enum WorkflowStatus
{
    DRAFT,      // User can still edit
    SUBMITTED,  // Awaiting manager review
    APPROVED,   // Approved by manager, copied to Firebird
    REJECTED    // Rejected by manager, user must revise
}

/// <summary>
/// PostgreSQL workflow entity for time entries
/// </summary>
[Table("time_entries_workflow")]
public class TimeEntryWorkflow
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("medew_gc_id")]
    public int MedewGcId { get; set; }

    [Required]
    [Column("urenper_gc_id")]
    public int UrenperGcId { get; set; }

    [Required]
    [Column("taak_gc_id")]
    public int TaakGcId { get; set; }

    [Column("werk_gc_id")]
    public int? WerkGcId { get; set; }

    [Required]
    [Column("datum")]
    public DateTime Datum { get; set; }

    [Required]
    [Column("aantal")]
    public decimal Aantal { get; set; }

    [Column("omschrijving")]
    public string? Omschrijving { get; set; }

    [Required]
    [Column("status")]
    public string Status { get; set; } = "DRAFT";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("submitted_at")]
    public DateTime? SubmittedAt { get; set; }

    [Column("reviewed_at")]
    public DateTime? ReviewedAt { get; set; }

    [Column("reviewed_by")]
    public int? ReviewedBy { get; set; }

    [Column("rejection_reason")]
    public string? RejectionReason { get; set; }

    [Column("firebird_gc_id")]
    public int? FirebirdGcId { get; set; }
}

/// <summary>
/// DTO for saving time entry as draft
/// </summary>
public class SaveDraftRequest
{
    public int? Id { get; set; } // Optional: if provided, updates existing draft instead of creating new

    [Required]
    public int UrenperGcId { get; set; }

    [Required]
    public int TaakGcId { get; set; }

    public int? WerkGcId { get; set; }

    [Required]
    public DateTime Datum { get; set; }

    [Required]
    [Range(0.1, 23.9)]
    public decimal Aantal { get; set; }

    public string? Omschrijving { get; set; }
}

/// <summary>
/// DTO for submitting time entries (can be multiple at once)
/// </summary>
public class SubmitTimeEntriesRequest
{
    [Required]
    public int UrenperGcId { get; set; }

    [Required]
    [MinLength(1)]
    public List<int> EntryIds { get; set; } = new();
}

/// <summary>
/// DTO for manager approval/rejection
/// </summary>
public class ReviewTimeEntriesRequest
{
    [Required]
    [MinLength(1)]
    public List<int> EntryIds { get; set; } = new();

    [Required]
    public bool Approve { get; set; }

    public string? RejectionReason { get; set; }
}

/// <summary>
/// DTO for workflow entry response
/// </summary>
public class WorkflowEntryDto
{
    public int Id { get; set; }
    public int MedewGcId { get; set; }
    public int UrenperGcId { get; set; }
    public int TaakGcId { get; set; }
    public int? WerkGcId { get; set; }
    public DateTime Datum { get; set; }
    public decimal Aantal { get; set; }
    public string? Omschrijving { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedBy { get; set; }
    public string? RejectionReason { get; set; }
    public int? FirebirdGcId { get; set; }

    // Enriched data from Firebird
    public string? EmployeeName { get; set; }
    public string? TaakCode { get; set; }
    public string? TaakDescription { get; set; }
    public string? WerkCode { get; set; }
    public string? WerkDescription { get; set; }
}

/// <summary>
/// Response for draft operations
/// </summary>
public class DraftResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public WorkflowEntryDto? Entry { get; set; }
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// Response for submit/review operations
/// </summary>
public class WorkflowResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int ProcessedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Response for getting workflow entries
/// </summary>
public class WorkflowEntriesResponse
{
    public List<WorkflowEntryDto> Entries { get; set; } = new();
    public int TotalCount { get; set; }
    public decimal TotalHours { get; set; }
}
