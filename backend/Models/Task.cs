namespace ClockwiseProject.Backend.Models
{
    public class TaskModel
    {
        public int GcId { get; set; }
        public string GcCode { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Omschrijving { get; set; } = string.Empty;
    }
}
