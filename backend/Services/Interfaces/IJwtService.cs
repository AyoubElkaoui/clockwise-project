using System.Security.Claims;

namespace backend.Services.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(User user, List<int> managerIds);
        ClaimsPrincipal? ValidateToken(string token);
    }
}