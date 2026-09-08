namespace ClockwiseProject.Backend.Models
{
    public class TimeEntriesResponse
    {
        public IEnumerable<TimeEntryDto> Entries { get; set; } = new List<TimeEntryDto>();
        public IEnumerable<ProjectDto> Projects { get; set; } = new List<ProjectDto>();
        public IEnumerable<ProjectGroupDto> ProjectGroups { get; set; } = new List<ProjectGroupDto>();
        public IEnumerable<object> Companies { get; set; } = new List<object>();
    }
}