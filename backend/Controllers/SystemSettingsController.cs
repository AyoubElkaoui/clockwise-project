using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/system-settings")]
    public class SystemSettingsController : ControllerBase
    {
        private readonly ILogger<SystemSettingsController> _logger;
        private readonly string _connectionString;

        public SystemSettingsController(
            ILogger<SystemSettingsController> logger,
            IConfiguration configuration)
        {
            _logger = logger;
            _connectionString = configuration.GetConnectionString("PostgreSQL")
                ?? throw new InvalidOperationException("PostgreSQL connection string not found");
        }

        // GET: api/system-settings
        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var settings = await connection.QueryAsync<SystemSetting>(
                "SELECT key, value FROM system_settings");

            var result = settings.ToDictionary(s => s.Key, s => s.Value);

            return Ok(result);
        }

        // GET: api/system-settings/{key}
        [HttpGet("{key}")]
        public async Task<IActionResult> GetSetting(string key)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var value = await connection.QueryFirstOrDefaultAsync<string>(
                "SELECT value FROM system_settings WHERE key = @Key",
                new { Key = key });

            if (value == null)
                return NotFound(new { message = $"Setting '{key}' not found" });

            return Ok(new { key, value });
        }

        // POST: api/system-settings
        [HttpPost]
        public async Task<IActionResult> SaveSettings([FromBody] Dictionary<string, string> settings)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            foreach (var setting in settings)
            {
                await connection.ExecuteAsync(
                    @"INSERT INTO system_settings (key, value, updated_at)
                      VALUES (@Key, @Value, NOW())
                      ON CONFLICT (key) DO UPDATE SET value = @Value, updated_at = NOW()",
                    new { Key = setting.Key, Value = setting.Value });
            }

            _logger.LogInformation("System settings updated: {Keys}", string.Join(", ", settings.Keys));

            return Ok(new { message = "Settings saved successfully" });
        }

        // GET: api/system-settings/require-2fa
        [HttpGet("require-2fa")]
        public async Task<IActionResult> GetRequire2FA()
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var value = await connection.QueryFirstOrDefaultAsync<string>(
                "SELECT value FROM system_settings WHERE key = 'require_2fa'");

            var require2FA = value?.ToLower() == "true";

            return Ok(new { require2FA });
        }
    }

    public class SystemSetting
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }
}
