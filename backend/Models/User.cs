public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public string HouseNumber { get; set; }
    public string PostalCode { get; set; }
    public string City { get; set; }
    public string LoginName { get; set; }
    public string Password { get; set; }
    public string Rank { get; set; }
    public string? Department { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Manager Relations
    public int? ManagerId { get; set; }  // Foreign key naar manager
    public User? Manager { get; set; }  // Navigation property naar manager
    public ICollection<User> ManagedEmployees { get; set; } = new List<User>();  // Employees onder deze manager
}
