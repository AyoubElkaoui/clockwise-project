public class User
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string Address { get; set; }
    public required string HouseNumber { get; set; }
    public required string PostalCode { get; set; }
    public required string City { get; set; }
    public required string LoginName { get; set; }
    public required string Password { get; set; }
    public required string Rank { get; set; }

    // Manager Relations
    public int? ManagerId { get; set; }  // Foreign key naar manager
    public User? Manager { get; set; }  // Navigation property naar manager
    public ICollection<User> ManagedEmployees { get; set; } = new List<User>();  // Employees onder deze manager
}
