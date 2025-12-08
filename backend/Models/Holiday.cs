public class Holiday
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Type { get; set; } = "Feestdag"; // "Feestdag" or "Sluitingsdag"
    public bool IsRecurring { get; set; } // Repeat yearly
    public int? CompanyId { get; set; } // null = all companies
    public Company? Company { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
