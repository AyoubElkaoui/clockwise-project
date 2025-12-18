using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompaniesController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;
        private readonly ILogger<CompaniesController> _logger;

        public CompaniesController(IFirebirdDataRepository repository, ILogger<CompaniesController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
        {
            var companies = await _repository.GetCompaniesAsync();
            _logger.LogInformation("Retrieved {Count} companies", companies.Count());
            return Ok(companies);
        }
    }
}
