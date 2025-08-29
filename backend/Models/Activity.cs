using System;

public class Activity
{
    public int Id { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.Now;
    
    public int UserId { get; set; }
    public User? User { get; set; }
    
    public string Type { get; set; } = "time_entry"; // time_entry, vacation, project, system
    
    public string Action { get; set; } = "submitted"; // submitted, approved, rejected, assigned, created, updated
    
    public string Message { get; set; } = "";
    
    public string? Details { get; set; } // Optionele JSON of extra info
    
    public bool Read { get; set; } = false;
    
}