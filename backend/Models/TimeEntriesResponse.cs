namespace ClockwiseProject.Backend.Models
{
    public class TimeEntriesResponse
    {
        public IEnumerable<TimeEntryDto> Entries { get; set; }
        public IEnumerable<ProjectDto> Projects { get; set; }
        public IEnumerable<ProjectGroupDto> ProjectGroups { get; set; }
        public IEnumerable<object> Companies { get; set; } = new List<object>();
    }
}