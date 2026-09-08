using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/periods")]
    public class PeriodsController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;
        private readonly ILogger<PeriodsController> _logger;

        public PeriodsController(IFirebirdDataRepository repository, ILogger<PeriodsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Period>>> GetPeriods([FromQuery] int count = 50)
        {
            if (count < 1 || count > 500)
                return BadRequest(new { error = "count moet tussen 1 en 500 liggen" });

            try
            {
                var periods = await _repository.GetPeriodsAsync(count);
                return Ok(periods);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching periods");
                return StatusCode(503, new { error = "Periodes zijn tijdelijk niet beschikbaar" });
            }
        }
    }
}
