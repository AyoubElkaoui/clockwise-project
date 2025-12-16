using System;

namespace ClockwiseProject.Domain
{
    public class Project
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public int ProjectGroupId { get; set; }
    }
}
