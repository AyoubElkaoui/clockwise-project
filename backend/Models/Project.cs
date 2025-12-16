namespace ClockwiseProject.Backend.Models
{
    public class Project
    {
        public int GcId { get; set; }
        public string GcCode { get; set; }
        public int WerkgrpGcId { get; set; }
        public string? Description { get; set; }
    }
}
