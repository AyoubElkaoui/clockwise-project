namespace ClockwiseProject.Backend.Models
{
    public class Period
    {
        public int GcId { get; set; }
        public string GcCode { get; set; } = string.Empty;
        public DateTime BeginDatum { get; set; }
        public DateTime EndDatum { get; set; }
    }
}
