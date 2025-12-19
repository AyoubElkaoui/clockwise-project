namespace ClockwiseProject.Backend.Models
{
    public class BulkWorkEntryDto
    {
        public int UrenperGcId { get; set; }
        public List<WorkEntryDto>? Regels { get; set; }
        public string? ClientRequestId { get; set; }
        public string Status { get; set; } = "concept"; // "concept" or "definitief"
    }
}
