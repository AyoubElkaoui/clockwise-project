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
    // Nieuwe property voor de workflow-status
    public string Status { get; set; } = "opgeslagen"; // standaardstatus
}