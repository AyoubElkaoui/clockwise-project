using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var token = await _authService.AuthenticateAsync(request.LoginName, request.Password);
            if (token == null)
            {
                return Unauthorized("Invalid credentials");
            }

            return Ok(new { Token = token });
        }

        // Optionally, add register or other auth endpoints
    }

    public class LoginRequest
    {
        public string LoginName { get; set; }
        public string Password { get; set; }
    }
}
