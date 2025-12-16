namespace ClockwiseProject.Backend.Models
{
    public class TimeEntry
    {
        public int GcId { get; set; }
        public int DocumentGcId { get; set; }
        public int TaakGcId { get; set; }
        public int? WerkGcId { get; set; }
        public int MedewGcId { get; set; }
        public int? KostsrtGcId { get; set; }
        public int? BestparGcId { get; set; }
        public int GcRegelNr { get; set; }
        public string? GcOmschrijving { get; set; }
        public decimal Aantal { get; set; }
        public DateTime Datum { get; set; }
    }
}
