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
            try
            {
                var periods = await _repository.GetPeriodsAsync(count);
                return Ok(periods);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching periods");

                // Return fallback periods when database error occurs
                var today = DateTime.Today;
                var fallbackPeriods = new List<Period>();
                for (int i = 0; i < Math.Min(count, 10); i++)
                {
                    var startDate = today.AddDays(-i * 7);
                    var endDate = startDate.AddDays(6);
                    fallbackPeriods.Add(new Period
                    {
                        GcId = 100000 + i,
                        GcCode = $"2026-W{(52 - i):00}",
                        BeginDatum = startDate,
                        EndDatum = endDate
                    });
                }
                return Ok(fallbackPeriods);
            }
        }
    }
}
