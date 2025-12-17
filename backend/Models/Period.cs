namespace ClockwiseProject.Backend.Models
{
    public class Period
    {
        public int GcId { get; set; }
        public string GcCode { get; set; }
        public DateTime BeginDatum { get; set; }
        public DateTime BoekDatum { get; set; }
        public DateTime EndDate { get; set; }
    }
}
