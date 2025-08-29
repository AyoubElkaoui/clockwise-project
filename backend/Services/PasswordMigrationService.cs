using backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public interface IPasswordMigrationService
    {
        Task MigrateExistingPasswordsAsync();
        Task<bool> IsPasswordHashedAsync(string password);
    }

    public class PasswordMigrationService : IPasswordMigrationService
    {
        private readonly ClockwiseDbContext _context;
        private readonly IPasswordService _passwordService;

        public PasswordMigrationService(ClockwiseDbContext context, IPasswordService passwordService)
        {
            _context = context;
            _passwordService = passwordService;
        }

        public async Task<bool> IsPasswordHashedAsync(string password)
        {
            // BCrypt hashes start with $2a$, $2b$, $2x$, or $2y$ and are typically 60 characters long
            return !string.IsNullOrEmpty(password) && 
                   password.Length == 60 && 
                   (password.StartsWith("$2a$") || password.StartsWith("$2b$") || 
                    password.StartsWith("$2x$") || password.StartsWith("$2y$"));
        }

        public async Task MigrateExistingPasswordsAsync()
        {
            Console.WriteLine("🔄 Starting password migration...");

            try
            {
                // Get all users with plain text passwords
                var users = await _context.Users
                    .Where(u => !string.IsNullOrEmpty(u.Password))
                    .ToListAsync();

                int migrated = 0;
                int skipped = 0;

                foreach (var user in users)
                {
                    if (await IsPasswordHashedAsync(user.Password))
                    {
                        Console.WriteLine($"⏭️ User {user.LoginName} already has hashed password, skipping");
                        skipped++;
                        continue;
                    }

                    Console.WriteLine($"🔐 Hashing password for user: {user.LoginName}");
                    
                    // Hash the plain text password
                    var hashedPassword = await _passwordService.HashPasswordAsync(user.Password);
                    
                    // Update the user's password
                    user.Password = hashedPassword;
                    
                    migrated++;
                }

                // Save all changes
                if (migrated > 0)
                {
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"✅ Password migration completed: {migrated} passwords hashed, {skipped} skipped");
                }
                else
                {
                    Console.WriteLine($"ℹ️ No passwords needed migration: {skipped} already hashed");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Password migration failed: {ex.Message}");
                throw;
            }
        }
    }
}
