using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClockwiseProject.Backend.Controllers
{
    /// <summary>
    /// GET /api/health - 200 zodra Firebird én PostgreSQL bereikbaar zijn, anders 503 met de reden.
    /// Wordt gebruikt door het start-/supervisorscript en de service-monitoring.
    /// </summary>
    [ApiController]
    [Route("api")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly DependencyStatus _status;
        public HealthController(DependencyStatus status) { _status = status; }

        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            var body = new
            {
                status = _status.Ready ? "ok" : "degraded",
                firebird = _status.FirebirdOk ? "ok" : (_status.FirebirdError ?? "niet gecontroleerd"),
                postgres = _status.PostgresOk ? "ok" : (_status.PostgresError ?? "niet gecontroleerd"),
                generatorsAligned = _status.GeneratorsAligned,
                startedAtUtc = _status.StartedAt,
                lastCheckUtc = _status.LastCheckUtc,
                version = typeof(HealthController).Assembly.GetName().Version?.ToString()
            };
            return _status.Ready ? Ok(body) : StatusCode(503, body);
        }
    }
}
