namespace ClockwiseProject.Backend.Models
{
    public class TimeEntryDto
    {
        public int DocumentGcId { get; set; }
        public int TaakGcId { get; set; }
        public int? WerkGcId { get; set; }
        public DateTime Datum { get; set; }
        public decimal Aantal { get; set; }
        public string? ProjectCode { get; set; }
        public string? ProjectName { get; set; }
        public string? TaskName { get; set; }
        public string? Description { get; set; }
    }
}