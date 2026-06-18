using backend.Services;
using backend.Repositories;
using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Domain;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthenticationService _authService;
    private readonly PostgreSQLUserRepository _userRepository;
    private readonly ITwoFactorService _twoFactorService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AuthenticationService authService,
        PostgreSQLUserRepository userRepository,
        ITwoFactorService twoFactorService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _userRepository = userRepository;
        _twoFactorService = twoFactorService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required" });
            }

            var result = await _authService.AuthenticateAsync(request.Username, request.Password);

            if (!result.IsSuccess)
            {
                return Unauthorized(new { message = result.ErrorMessage });
            }

            var user = await _userRepository.GetFor2FAAsync(result.User!.Id);

            if (user?.TwoFactorEnabled == true)
            {
                if (string.IsNullOrEmpty(request.TwoFactorCode))
                {
                    if (user.TwoFactorMethod == "email")
                    {
                        var code = _twoFactorService.GenerateEmailCode();
                        var expiresAt = DateTime.UtcNow.AddMinutes(10);

                        await _userRepository.UpdateEmailCodeAsync(user.Id, code, expiresAt);

                        try
                        {
                            await _twoFactorService.SendEmailCodeAsync(user.Email, code);
                            _logger.LogInformation("2FA email code sent to user {UserId}", user.Id);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send 2FA email");
                            return StatusCode(500, new { message = "Failed to send verification email" });
                        }
                    }

                    return Ok(new
                    {
                        requires2FA = true,
                        method = user.TwoFactorMethod,
                        message = user.TwoFactorMethod == "email"
                            ? "Verificatiecode verstuurd naar je email"
                            : "Voer de code in van je authenticator app"
                    });
                }

                bool isValid = false;

                if (user.TwoFactorMethod == "totp" && !string.IsNullOrEmpty(user.TwoFactorSecret))
                {
                    var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
                    isValid = _twoFactorService.VerifyTotpCode(secret, request.TwoFactorCode);
                }
                else if (user.TwoFactorMethod == "email")
                {
                    isValid = _twoFactorService.IsEmailCodeValid(
                        user.TwoFactorEmailCode ?? "",
                        user.TwoFactorCodeExpiresAt,
                        request.TwoFactorCode);
                }

                if (!isValid && !string.IsNullOrEmpty(user.TwoFactorBackupCodes))
                {
                    isValid = _twoFactorService.VerifyBackupCode(user.TwoFactorBackupCodes, request.TwoFactorCode);
                    if (isValid)
                        _logger.LogWarning("User {UserId} used backup code for 2FA login", user.Id);
                }

                if (!isValid)
                {
                    _logger.LogWarning("Failed 2FA attempt for user {UserId}", user.Id);
                    return Unauthorized(new { message = "Ongeldige 2FA code" });
                }

                _logger.LogInformation("User {UserId} successfully logged in with 2FA", user.Id);
            }

            bool require2FASetup = false;
            var require2FASetting = await _userRepository.GetSystemSettingAsync("require_2fa");
            if (require2FASetting?.ToLower() == "true" && user?.TwoFactorEnabled != true)
            {
                require2FASetup = true;
                _logger.LogInformation("User {UserId} needs to setup 2FA (system requirement)", result.User!.Id);
            }

            return Ok(new
            {
                token = result.Token,
                require2FASetup = require2FASetup,
                user = new
                {
                    id = result.User!.Id,
                    username = result.User.Username,
                    medew_gc_id = result.User.MedewGcId,
                    email = result.User.Email,
                    role = result.User.Role,
                    first_name = result.User.FirstName,
                    last_name = result.User.LastName,
                    allowed_tasks = result.User.AllowedTasks,
                    twoFactorEnabled = user?.TwoFactorEnabled ?? false
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            if (!HttpContext.Items.TryGetValue("MedewGcId", out var medewGcIdObj) || medewGcIdObj is not int medewGcId)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userRepository.GetByMedewGcIdAsync(medewGcId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                medewGcId = user.MedewGcId,
                email = user.Email,
                role = user.Role,
                firstName = user.FirstName,
                lastName = user.LastName,
                allowedTasks = user.AllowedTasks
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching current user");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPost("hash-password")]
    public IActionResult HashPassword([FromBody] HashPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Password is required" });
        }

        var hash = _authService.HashPassword(request.Password);
        return Ok(new { password_hash = hash });
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? TwoFactorCode { get; set; }
}

public class HashPasswordRequest
{
    public string Password { get; set; } = string.Empty;
}
