using Microsoft.AspNetCore.Mvc;
using FirebirdSql.Data.FirebirdClient;
using ClockwiseProject.Backend;
using Microsoft.AspNetCore.Authorization;
using Dapper;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly FirebirdConnectionFactory _connectionFactory;

        public HealthController(FirebirdConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            return Ok(new { status = "ok" });
        }

        [HttpGet("tables")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTables()
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                await connection.OpenAsync();
                const string sql = "SELECT TRIM(RDB$RELATION_NAME) AS TableName FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_TYPE = 0 ORDER BY RDB$RELATION_NAME";
                var tables = await connection.QueryAsync<string>(sql);
                return Ok(tables);
            }
            catch (Exception ex)
            {
                return Ok(new { error = ex.Message });
            }
        }
    }
}
