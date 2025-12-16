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

        public PeriodsController(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Period>>> GetPeriods([FromQuery] int count = 50)
        {
            var periods = await _repository.GetPeriodsAsync(count);
            return Ok(periods);
        }
    }
}
