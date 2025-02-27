public class Project
{
    public int Id { get; set; }
    public required string Name { get; set; }
    
    public int ProjectGroupId { get; set; }  // Zorg voor de FK
    public ProjectGroup? ProjectGroup { get; set; }
}