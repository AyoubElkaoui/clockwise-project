using System;

public class VacationRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }  // Navigatie-eigenschap

    // De start- en einddatum van de vakantie
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Bereken het aantal verlofuren (bijvoorbeeld: werkuren per dag * aantal werkdagen)
    public double Hours { get; set; }

    // Reden voor de vakantie (optioneel)
    public string? Reason { get; set; }

    // Status: "pending", "approved", "rejected"
    public string Status { get; set; } = "pending";
    
    // Manager feedback bij goedkeuren/afkeuren
    public string? ManagerComment { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedBy { get; set; }
}