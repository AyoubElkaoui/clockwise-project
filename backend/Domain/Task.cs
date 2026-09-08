namespace ClockwiseProject.Domain
{
    public class WorkTask
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string Status { get; set; } = "pending";
    }
}
