namespace ClockwiseProject.Backend.Models
{
    public class ReviewRequest
    {
        public string ManagerComment { get; set; } = string.Empty;
        public int ReviewedBy { get; set; }
    }
}
