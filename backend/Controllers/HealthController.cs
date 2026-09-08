using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            return Ok(new { status = "ok" });
        }
    }
}
