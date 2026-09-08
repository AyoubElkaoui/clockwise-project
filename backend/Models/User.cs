public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string HouseNumber { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string LoginName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Rank { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // Manager Relations
    public int? ManagerId { get; set; }  // Foreign key naar manager
    public User? Manager { get; set; }  // Navigation property naar manager
    public ICollection<User> ManagedEmployees { get; set; } = new List<User>();  // Employees onder deze manager

    // 2FA Properties
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorMethod { get; set; } // "email", "totp", of null
    public string? TwoFactorSecret { get; set; } // Encrypted TOTP secret
    public string? TwoFactorEmailCode { get; set; }
    public DateTime? TwoFactorCodeExpiresAt { get; set; }
    public string? TwoFactorBackupCodes { get; set; } // JSON array
}
