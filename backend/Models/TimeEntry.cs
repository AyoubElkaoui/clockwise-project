public class TimeEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int BreakMinutes { get; set; }
    public double DistanceKm { get; set; }
    public decimal TravelCosts { get; set; }
    public decimal Expenses { get; set; }
    public string? Notes { get; set; }
    
    // Status property with consistent backend values
    // Backend uses: "opgeslagen" (draft), "ingeleverd" (submitted), "goedgekeurd" (approved)
    // Frontend will convert these to: "concept", "ingediend", "goedgekeurd"
    public string Status { get; set; } = "opgeslagen"; // default to draft status
    
    // Tracking fields for who processed the request
    public int? ProcessedBy { get; set; }  // UserId of admin/manager who processed
    public User? ProcessedByUser { get; set; }  // Navigation property
    public DateTime? ProcessedDate { get; set; }  // When it was processed
    public string? ProcessingNotes { get; set; }  // Notes for approval/rejection
    public DateTime RequestDate { get; set; } = DateTime.Now;  // When entry was created
    
    // Optional: Add a computed property for frontend-friendly status
    public string FrontendStatus
    {
        get
        {
            return Status switch
            {
                "opgeslagen" => "concept",
                "ingeleverd" => "ingediend", 
                "goedgekeurd" => "goedgekeurd",
                _ => "concept"
            };
        }
    }
    
    // Status check properties
    public bool IsDraft => Status == "opgeslagen";
    public bool IsSubmitted => Status == "ingeleverd";
    public bool IsApproved => Status == "goedgekeurd";
    
    // Calculate total worked hours
    public double TotalHours => (EndTime - StartTime).TotalHours - (BreakMinutes / 60.0);
}