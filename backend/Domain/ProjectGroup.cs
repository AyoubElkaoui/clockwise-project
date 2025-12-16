namespace ClockwiseProject.Domain
{
    public class ProjectGroup
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public int CompanyId { get; set; }
    }
}
