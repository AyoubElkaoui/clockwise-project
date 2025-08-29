using System;

public class VacationRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }  

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; } 
 
    public double Hours { get; set; }
    public string? Reason { get; set; }

    // UPDATED: Status with two-step approval
    // "pending" -> "manager_approved" -> "approved" OR "rejected" at any stage
    public string Status { get; set; } = "pending";

    // MANAGER APPROVAL TRACKING
    public int? ManagerApprovedBy { get; set; }  // Manager who approved first
    public User? ManagerApprovedByUser { get; set; }  // Navigation property
    public DateTime? ManagerApprovedDate { get; set; }  // When manager approved
    public string? ManagerApprovalNotes { get; set; }  // Manager's notes

    // ADMIN FINAL APPROVAL TRACKING
    public int? ProcessedBy { get; set; }  // Admin who gave final approval/rejection
    public User? ProcessedByUser { get; set; }  // Navigation property
    public DateTime? ProcessedDate { get; set; }  // When admin processed
    public string? ProcessingNotes { get; set; }  // Admin's notes for rejection/approval

    // ORIGINAL SUBMISSION TRACKING
    public DateTime RequestDate { get; set; } = DateTime.Now;  // When request was created

    /// <summary>
    /// Helper method to determine if this request needs manager approval
    /// </summary>
    public bool NeedsManagerApproval => Status == "pending";

    /// <summary>
    /// Helper method to determine if this request needs admin approval
    /// </summary>
    public bool NeedsAdminApproval => Status == "manager_approved";

    /// <summary>
    /// Helper method to determine if this request is fully approved
    /// </summary>
    public bool IsFullyApproved => Status == "approved";

    /// <summary>
    /// Helper method to determine if this request was rejected
    /// </summary>
    public bool IsRejected => Status == "rejected";

    /// <summary>
    /// Get the current approval stage for display
    /// </summary>
    public string GetApprovalStage()
    {
        return Status switch
        {
            "pending" => "Pending Manager Approval",
            "manager_approved" => "Pending Admin Approval", 
            "approved" => "Fully Approved",
            "rejected" => "Rejected",
            _ => "Unknown Status"
        };
    }

    /// <summary>
    /// Get who can act on this request next
    /// </summary>
    public string GetNextApprover()
    {
        return Status switch
        {
            "pending" => "Manager",
            "manager_approved" => "Admin",
            "approved" => "None - Completed",
            "rejected" => "None - Rejected",
            _ => "Unknown"
        };
    }
}