using System.Collections.Generic;

public class ProjectGroup
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int CompanyId { get; set; }
    public Company? Company { get; set; }  // Maak nullable of gebruik 'required'
    public List<Project> Projects { get; set; } = new();
}