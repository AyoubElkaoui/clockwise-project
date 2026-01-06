using System;

namespace ClockwiseProject.Domain
{
    public class VacationRequest
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }  // Navigation property

        // De start- en einddatum van de vakantie
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        // Bereken het aantal verlofuren (bijvoorbeeld: werkuren per dag * aantal werkdagen)
        public double Hours { get; set; }

        // Reden voor de vakantie (optioneel)
        public string? Reason { get; set; }

        // Status: "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"
        public string Status { get; set; } = "SUBMITTED";

        // Manager feedback bij goedkeuren/afkeuren
        public string? ManagerComment { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedBy { get; set; }
        
        // Timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }
}
