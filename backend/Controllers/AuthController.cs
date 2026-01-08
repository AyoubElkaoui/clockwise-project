using backend.Services;
using backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthenticationService _authService;
    private readonly PostgreSQLUserRepository _userRepository;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AuthenticationService authService,
        PostgreSQLUserRepository userRepository,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _userRepository = userRepository;
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

            return Ok(new
            {
                token = result.Token,
                user = new
                {
                    id = result.User!.Id,
                    username = result.User.Username,
                    medew_gc_id = result.User.MedewGcId,
                    email = result.User.Email,
                    role = result.User.Role,
                    first_name = result.User.FirstName,
                    last_name = result.User.LastName,
                    allowed_tasks = result.User.AllowedTasks
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
            // Get medewGcId from HTTP context (set by authentication middleware)
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
}

public class HashPasswordRequest
{
    public string Password { get; set; } = string.Empty;
}
