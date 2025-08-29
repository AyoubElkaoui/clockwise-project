using System.Threading.Tasks;

namespace backend.Services.Interfaces
{
    public interface IPasswordService
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
        Task<string> HashPasswordAsync(string password);
        Task<bool> VerifyPasswordAsync(string password, string hashedPassword);
    }
}
