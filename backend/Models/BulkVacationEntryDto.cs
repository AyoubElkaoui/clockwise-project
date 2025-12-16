namespace ClockwiseProject.Backend.Models
{
    public class BulkVacationEntryDto
    {
        public int UrenperGcId { get; set; }
        public List<VacationEntryDto>? Regels { get; set; }
        public string? ClientRequestId { get; set; }
    }
}
