namespace ClockwiseProject.Domain
{
    public class WorkTask
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int ProjectId { get; set; }
        public string Status { get; set; } = "pending";
    }
}
