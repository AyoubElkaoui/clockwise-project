// backend/Models/UserProject.cs
public class UserProject
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public DateTime AssignedDate { get; set; } = DateTime.Now;
    public int? AssignedByUserId { get; set; }  // ID van admin/manager die de koppeling maakte
    public User? AssignedByUser { get; set; }
}