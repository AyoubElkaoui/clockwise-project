using backend.Services.Interfaces;
using BCrypt.Net;

namespace backend.Services
{
    public class PasswordService : IPasswordService
    {
        private const int WorkFactor = 12; // Higher = more secure but slower (10-12 is good)

        public string HashPassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new ArgumentException("Password cannot be null or empty", nameof(password));

            return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hashedPassword))
                return false;

            try
            {
                return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Password verification error: {ex.Message}");
                return false;
            }
        }

        public async Task<string> HashPasswordAsync(string password)
        {
            return await Task.Run(() => HashPassword(password));
        }

        public async Task<bool> VerifyPasswordAsync(string password, string hashedPassword)
        {
            return await Task.Run(() => VerifyPassword(password, hashedPassword));
        }
    }
}