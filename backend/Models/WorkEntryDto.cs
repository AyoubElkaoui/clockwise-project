namespace ClockwiseProject.Backend.Models
{
    public class WorkEntryDto
    {
        public int TaakGcId { get; set; }
        public int WerkGcId { get; set; }
        public decimal Aantal { get; set; }
        public DateTime Datum { get; set; }
        public string? GcOmschrijving { get; set; }
        public int? KostsrtGcId { get; set; }
        public int? BestparGcId { get; set; }
    }
}
