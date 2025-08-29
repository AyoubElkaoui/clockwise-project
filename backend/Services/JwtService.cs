using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Services.Interfaces;

namespace backend.Services
{
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(User user, List<int> managerIds)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.LoginName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName),
                new Claim(ClaimTypes.Role, user.Rank),
                new Claim("fullName", $"{user.FirstName} {user.LastName}"),
                new Claim("isAdmin", (user.Rank == "admin").ToString().ToLower()),
                new Claim("isManager", (user.Rank == "manager").ToString().ToLower()),
                new Claim("isNormalUser", (user.Rank == "user").ToString().ToLower())
            };

            // Add manager ID if exists
            if (user.ManagerId.HasValue)
            {
                claims.Add(new Claim("managerId", user.ManagerId.Value.ToString()));
            }

            // Add all manager IDs as separate claims
            foreach (var managerId in managerIds)
            {
                claims.Add(new Claim("assignedManagerId", managerId.ToString()));
            }

            // Add manager IDs as JSON string for easy access
            claims.Add(new Claim("assignedManagerIds", string.Join(",", managerIds)));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(double.Parse(_configuration["Jwt:ExpireMinutes"])),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            try
            {
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
                var tokenHandler = new JwtSecurityTokenHandler();

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidAudience = _configuration["Jwt:Audience"],
                    IssuerSigningKey = key,
                    ClockSkew = TimeSpan.Zero
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}
