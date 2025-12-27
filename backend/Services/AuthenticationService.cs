using backend.Repositories;
using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Services;

public class AuthenticationService
{
    private readonly PostgreSQLUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthenticationService> _logger;

    public AuthenticationService(
        PostgreSQLUserRepository userRepository,
        IConfiguration configuration,
        ILogger<AuthenticationService> logger)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthenticationResult> AuthenticateAsync(string username, string password)
    {
        try
        {
            // Get user from PostgreSQL
            var user = await _userRepository.GetByUsernameAsync(username);

            if (user == null)
            {
                _logger.LogWarning("Login attempt with non-existent username: {Username}", username);
                return AuthenticationResult.Failed("Invalid username or password");
            }

            // Debug logging
            _logger.LogInformation("User found: {Username}, PasswordHash length: {Length}, IsNull: {IsNull}, IsEmpty: {IsEmpty}",
                user.Username,
                user.PasswordHash?.Length ?? 0,
                user.PasswordHash == null,
                string.IsNullOrEmpty(user.PasswordHash));

            // Verify password
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                _logger.LogError("PasswordHash is null or empty for user: {Username}", username);
                return AuthenticationResult.Failed("Invalid username or password");
            }

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                _logger.LogWarning("Failed login attempt for user: {Username}", username);
                return AuthenticationResult.Failed("Invalid username or password");
            }

            // Update last login
            await _userRepository.UpdateLastLoginAsync(user.Id);

            // Generate JWT token
            var token = GenerateJwtToken(user);

            _logger.LogInformation("Successful login for user: {Username}", username);

            return AuthenticationResult.Success(token, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during authentication for username: {Username}", username);
            return AuthenticationResult.Failed("An error occurred during authentication");
        }
    }

    private string GenerateJwtToken(PostgresUser user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("medew_gc_id", user.MedewGcId.ToString()),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim("first_name", user.FirstName ?? string.Empty),
            new Claim("last_name", user.LastName ?? string.Empty)
        };

        var token = new JwtSecurityToken(
            issuer: "clockwise-backend",
            audience: "clockwise-frontend",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
}

public class AuthenticationResult
{
    public bool IsSuccess { get; set; }
    public string? Token { get; set; }
    public PostgresUser? User { get; set; }
    public string? ErrorMessage { get; set; }

    public static AuthenticationResult Success(string token, PostgresUser user)
    {
        return new AuthenticationResult
        {
            IsSuccess = true,
            Token = token,
            User = user
        };
    }

    public static AuthenticationResult Failed(string errorMessage)
    {
        return new AuthenticationResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
