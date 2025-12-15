public class BulkActionDto
{
    public List<int> EntryIds { get; set; } = new List<int>();
    public string Action { get; set; } = string.Empty; // "approve" or "reject"
}
