using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;
using Dapper;
using FirebirdSql.Data.FirebirdClient;


namespace ClockwiseProject.Backend.Controllers
{
    public class UserLoginRequest
    {
        public int MedewGcId { get; set; }
    }

    [ApiController]
    [Route("api/firebird-users")]
    public class FirebirdUsersController : ControllerBase
    {
        private readonly IFirebirdDataRepository _repository;
        private readonly ILogger<FirebirdUsersController> _logger;

        public FirebirdUsersController(IFirebirdDataRepository repository, ILogger<FirebirdUsersController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            try
            {
                var users = await _repository.GetUsersAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            try
            {
                var user = await _repository.GetUserByIdAsync(id);
                if (user == null)
                {
                    return NotFound();
                }
                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User updatedUser)
        {
            if (id != updatedUser.Id)
            {
                return BadRequest("ID mismatch");
            }

            try
            {
                // For demo, just return success - in real app, update in DB
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<User>> Login([FromBody] UserLoginRequest request)
        {
            try
            {
                _logger.LogInformation("Login attempt for MedewGcId: {MedewGcId}", request.MedewGcId);
                var user = await _repository.GetUserByIdAsync(request.MedewGcId);
                if (user == null)
                {
                    _logger.LogWarning("Invalid MedewGcId: {MedewGcId}", request.MedewGcId);
                    return Unauthorized("Invalid MedewGcId");
                }
                _logger.LogInformation("Login successful for user: {UserId}", user.Id);
                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for MedewGcId: {MedewGcId}", request.MedewGcId);
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpPost("seed")]
        public async Task<IActionResult> SeedDatabase()
        {
            try
            {
                using var connection = _repository.GetConnection();
                await connection.OpenAsync();
                var seedSql = await System.IO.File.ReadAllTextAsync("seed.sql");
                var commands = seedSql.Split(";", StringSplitOptions.RemoveEmptyEntries);
                foreach (var command in commands)
                {
                    if (!string.IsNullOrWhiteSpace(command))
                    {
                        using var cmd = new FbCommand(command.Trim(), connection);
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                return Ok("Database seeded");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding database");
                return StatusCode(500, "Seeding failed");
            }
        }

        [HttpGet("test")]
        public async Task<IActionResult> TestDatabase()
        {
            try
            {
                using var connection = _repository.GetConnection();
                await connection.OpenAsync();
                var result = await connection.QueryAsync("SELECT * FROM AT_MEDEW");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing database");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteSql([FromBody] string sql)
        {
            try
            {
                using var connection = _repository.GetConnection();
                await connection.OpenAsync();
                var result = await connection.ExecuteAsync(sql);
                return Ok($"Executed, affected rows: {result}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing SQL");
                return StatusCode(500, ex.Message);
            }
        }
    }
}
