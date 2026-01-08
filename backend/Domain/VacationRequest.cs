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

        // Vakantie type code (Z03, Z10, etc from AT_TAAK)
        public string VacationType { get; set; } = "Z03"; // Default: Vakantie
        
        // Aantal dagen (niet uren)
        public decimal TotalDays { get; set; }

        // Notities/reden voor de vakantie (optioneel)
        public string? Notes { get; set; }

        // Status: "pending", "approved", "rejected"
        public string Status { get; set; } = "pending";

        // Manager feedback bij goedkeuren/afkeuren
        public string? RejectionReason { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedBy { get; set; }
        
        // Timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Backwards compatibility
        public double Hours => (double)TotalDays * 8; // Voor oude code die Hours verwacht
        public string? Reason => Notes; // Voor oude code die Reason verwacht
        public string? ManagerComment => RejectionReason;
    }
}
