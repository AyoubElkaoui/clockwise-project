namespace ClockwiseProject.Domain
{
    public class Timesheet
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int ProjectId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int BreakMinutes { get; set; }
        public double DistanceKm { get; set; }
        public decimal TravelCosts { get; set; }
        public decimal Expenses { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "opgeslagen";
        public string? ManagerComment { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedBy { get; set; }
    }
}
