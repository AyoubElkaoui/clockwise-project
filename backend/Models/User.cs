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
    public required string Rank { get; set; } // "user", "manager", "admin"
    public string? Function { get; set; }
    
    // Single manager for backward compatibility
    public int? ManagerId { get; set; }
    public User? Manager { get; set; }
    
    // UPDATED: Multiple managers stored as comma-separated string
    public string? ManagerIds { get; set; } // e.g., "11,4,18"
    
    // Navigation properties
    public List<User> ManagedUsers { get; set; } = new List<User>();
    public List<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
    public List<TimeEntry> ProcessedTimeEntries { get; set; } = new List<TimeEntry>();
    
    // Helper properties for role checking
    public bool IsAdmin => Rank == "admin";
    public bool IsManager => Rank == "manager";
    public bool IsNormalUser => Rank == "user";
    
    // Helper property for full name
    public string FullName => $"{FirstName} {LastName}";
    
    // UPDATED: Helper method to get manager IDs as list
    public List<int> GetManagerIdsList()
    {
        var managerIds = new List<int>();
        
        // Add primary manager if exists
        if (ManagerId.HasValue)
            managerIds.Add(ManagerId.Value);
            
        // Parse additional managers from ManagerIds string
        if (!string.IsNullOrEmpty(ManagerIds))
        {
            var ids = ManagerIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                               .Select(id => int.TryParse(id.Trim(), out var parsed) ? parsed : (int?)null)
                               .Where(id => id.HasValue)
                               .Select(id => id.Value)
                               .ToList();
            managerIds.AddRange(ids);
        }
        
        return managerIds.Distinct().ToList();
    }
    
    // Helper method to set manager IDs from list
    public void SetManagerIdsList(List<int> managerIds)
    {
        if (managerIds == null || !managerIds.Any())
        {
            ManagerIds = null;
            return;
        }
        
        // Remove any duplicates and sort
        var uniqueIds = managerIds.Distinct().OrderBy(id => id).ToList();
        ManagerIds = string.Join(",", uniqueIds);
    }
    
    // UPDATED: Check if this user can manage another user
    public bool CanManage(User user)
    {
        if (IsAdmin) return true;
        if (!IsManager) return false;
        
        // Check both single manager and multiple managers
        var userManagerIds = user.GetManagerIdsList();
        return userManagerIds.Contains(Id);
    }
    
    // Check if this user can approve time entries
    public bool CanApproveTimeEntries => IsManager || IsAdmin;
}