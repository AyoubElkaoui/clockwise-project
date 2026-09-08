using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/system-settings")]
    public class SystemSettingsController : ControllerBase
    {
        private const string AdminOnlyMessage = "Alleen beheerders mogen systeeminstellingen beheren";

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

        // GET: api/system-settings (admin only)
        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            if (!this.IsAdmin())
                return StatusCode(403, new { error = AdminOnlyMessage });

            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var settings = await connection.QueryAsync<SystemSetting>(
                    "SELECT key, value FROM system_settings");

                var result = settings.ToDictionary(s => s.Key, s => s.Value);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching system settings");
                return StatusCode(500, new { error = "Fout bij ophalen systeeminstellingen" });
            }
        }

        // GET: api/system-settings/require-2fa (public)
        // NB: staat vóór {key} zodat de route niet als key wordt geïnterpreteerd.
        [HttpGet("require-2fa")]
        public async Task<IActionResult> GetRequire2FA()
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var value = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT value FROM system_settings WHERE key = 'require_2fa'");

                var require2FA = string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
                return Ok(new { require2FA });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching require_2fa setting");
                return StatusCode(500, new { error = "Fout bij ophalen 2FA-instelling" });
            }
        }

        // GET: api/system-settings/{key} (ingelogd)
        [HttpGet("{key}")]
        public async Task<IActionResult> GetSetting(string key)
        {
            if (this.CurrentUserId() == null)
                return Unauthorized(new { error = "Niet ingelogd" });

            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                var value = await connection.QueryFirstOrDefaultAsync<string>(
                    "SELECT value FROM system_settings WHERE key = @Key",
                    new { Key = key });

                if (value == null)
                    return NotFound(new { error = $"Instelling '{key}' niet gevonden" });

                return Ok(new { key, value });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching system setting {Key}", key);
                return StatusCode(500, new { error = "Fout bij ophalen instelling" });
            }
        }

        // POST: api/system-settings (admin only)
        [HttpPost]
        public async Task<IActionResult> SaveSettings([FromBody] Dictionary<string, string>? settings)
        {
            if (!this.IsAdmin())
                return StatusCode(403, new { error = AdminOnlyMessage });

            if (settings == null || settings.Count == 0)
                return BadRequest(new { error = "Geen instellingen meegegeven" });

            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                foreach (var setting in settings)
                {
                    if (string.IsNullOrWhiteSpace(setting.Key))
                        return BadRequest(new { error = "Instellingssleutel mag niet leeg zijn" });

                    await connection.ExecuteAsync(
                        @"INSERT INTO system_settings (key, value, updated_at)
                          VALUES (@Key, @Value, NOW())
                          ON CONFLICT (key) DO UPDATE SET value = @Value, updated_at = NOW()",
                        new { Key = setting.Key, Value = setting.Value ?? string.Empty });
                }

                _logger.LogInformation("System settings updated by user {UserId}: {Keys}",
                    this.CurrentUserId(), string.Join(", ", settings.Keys));

                return Ok(new { message = "Instellingen opgeslagen" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving system settings");
                return StatusCode(500, new { error = "Fout bij opslaan systeeminstellingen" });
            }
        }
    }

    public class SystemSetting
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }
}
