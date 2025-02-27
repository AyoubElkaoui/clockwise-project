using System.Collections.Generic;

public class Company
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public List<ProjectGroup> ProjectGroups { get; set; } = new();
}