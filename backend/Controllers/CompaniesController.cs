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

        public CompaniesController(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
        {
            try
            {
                var companies = await _repository.GetCompaniesAsync();
                return Ok(companies);
            }
            catch (Exception ex)
            {
                // Log the exception
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
