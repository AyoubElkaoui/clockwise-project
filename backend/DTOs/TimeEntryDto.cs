public class TimeEntryDto
{
    public int? Id { get; set; }
    public int UserId { get; set; }
    public string Date { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public double Hours { get; set; }
    public double Km { get; set; }
    public decimal Expenses { get; set; }
    public int BreakMinutes { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
}
