using System;

namespace ClockwiseProject.Domain
{
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
}
