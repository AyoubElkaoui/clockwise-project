using Microsoft.AspNetCore.Mvc;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("")]
    public class HealthController : ControllerBase
    {
        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            return Ok(new { status = "ok" });
        }
    }
}
