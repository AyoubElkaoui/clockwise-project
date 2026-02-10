using backend.Models;
using backend.Services;
using ClockwiseProject.Backend.Models;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/two-factor")]
    public class TwoFactorController : ControllerBase
    {
        private readonly ITwoFactorService _twoFactorService;
        private readonly ILogger<TwoFactorController> _logger;
        private readonly string _connectionString;

        public TwoFactorController(
            ITwoFactorService twoFactorService,
            ILogger<TwoFactorController> logger,
            IConfiguration configuration)
        {
            _twoFactorService = twoFactorService;
            _logger = logger;
            _connectionString = configuration.GetConnectionString("PostgreSQL") ?? throw new InvalidOperationException("PostgreSQL connection string not found");
        }

        // POST: api/two-factor/setup
        [HttpPost("setup")]
        public async Task<ActionResult<TwoFactorSetupResponse>> Setup([FromBody] TwoFactorSetupRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                @"SELECT id AS Id, email AS Email,
                         two_factor_enabled AS TwoFactorEnabled,
                         two_factor_method AS TwoFactorMethod,
                         two_factor_secret AS TwoFactorSecret,
                         two_factor_backup_codes AS TwoFactorBackupCodes
                  FROM users WHERE id = @Id", new { Id = userId });

            if (user == null)
                return NotFound(new { message = "User not found" });

            var response = new TwoFactorSetupResponse
            {
                Method = request.Method
            };

            if (request.Method == "totp")
            {
                var secret = _twoFactorService.GenerateTotpSecret();
                var encryptedSecret = _twoFactorService.EncryptSecret(secret);
                var qrCodeDataUrl = _twoFactorService.GenerateQrCodeDataUrl(user.Email, secret);
                
                var backupCodes = _twoFactorService.GenerateBackupCodes();
                var hashedBackupCodes = _twoFactorService.HashBackupCodes(backupCodes);

                await connection.ExecuteAsync(
                    @"UPDATE users 
                      SET two_factor_secret = @Secret,
                          two_factor_backup_codes = @BackupCodes,
                          two_factor_method = 'totp'
                      WHERE id = @UserId",
                    new { Secret = encryptedSecret, BackupCodes = hashedBackupCodes, UserId = userId });

                response.Secret = secret;
                response.QrCodeDataUrl = qrCodeDataUrl;
                response.BackupCodes = backupCodes;
                
                _logger.LogInformation("TOTP 2FA setup initiated for user {UserId}", userId);
            }
            else if (request.Method == "email")
            {
                var backupCodes = _twoFactorService.GenerateBackupCodes();
                var hashedBackupCodes = _twoFactorService.HashBackupCodes(backupCodes);

                await connection.ExecuteAsync(
                    @"UPDATE users 
                      SET two_factor_backup_codes = @BackupCodes,
                          two_factor_method = 'email'
                      WHERE id = @UserId",
                    new { BackupCodes = hashedBackupCodes, UserId = userId });

                response.BackupCodes = backupCodes;
                
                _logger.LogInformation("Email 2FA setup initiated for user {UserId}", userId);
            }
            else
            {
                return BadRequest(new { message = "Invalid method. Use 'totp' or 'email'" });
            }

            return Ok(response);
        }

        // POST: api/two-factor/verify
        [HttpPost("verify")]
        public async Task<ActionResult<TwoFactorResponse>> VerifyAndEnable([FromBody] TwoFactorVerifyRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                @"SELECT id AS Id, email AS Email,
                         two_factor_enabled AS TwoFactorEnabled,
                         two_factor_method AS TwoFactorMethod,
                         two_factor_secret AS TwoFactorSecret,
                         two_factor_backup_codes AS TwoFactorBackupCodes
                  FROM users WHERE id = @Id", new { Id = userId });

            if (user == null)
                return NotFound(new { message = "User not found" });

            _logger.LogInformation("Verify 2FA for user {UserId}: Method={Method}, HasSecret={HasSecret}",
                userId, user.TwoFactorMethod ?? "null", !string.IsNullOrEmpty(user.TwoFactorSecret));

            bool isValid = false;

            if (user.TwoFactorMethod == "totp")
            {
                if (string.IsNullOrEmpty(user.TwoFactorSecret))
                    return BadRequest(new { message = "TOTP not configured" });

                var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
                isValid = _twoFactorService.VerifyTotpCode(secret, request.Code);
            }
            else if (user.TwoFactorMethod == "email")
            {
                // Voor email accepteren we direct de eerste verificatie
                isValid = true;
            }
            else
            {
                return BadRequest(new { message = "2FA not configured" });
            }

            if (isValid)
            {
                await connection.ExecuteAsync(
                    "UPDATE users SET two_factor_enabled = true WHERE id = @Id",
                    new { Id = userId });

                _logger.LogInformation("2FA enabled for user {UserId} with method {Method}", 
                    userId, user.TwoFactorMethod);

                return Ok(new TwoFactorResponse
                {
                    Success = true,
                    Message = "2FA successfully enabled"
                });
            }

            _logger.LogWarning("Failed 2FA verification for user {UserId}", userId);
            return BadRequest(new TwoFactorResponse
            {
                Success = false,
                Message = "Invalid verification code"
            });
        }

        // POST: api/two-factor/disable
        [HttpPost("disable")]
        public async Task<IActionResult> Disable([FromBody] TwoFactorDisableRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                @"SELECT id AS Id, email AS Email,
                         two_factor_enabled AS TwoFactorEnabled,
                         two_factor_method AS TwoFactorMethod,
                         two_factor_secret AS TwoFactorSecret,
                         two_factor_email_code AS TwoFactorEmailCode,
                         two_factor_code_expires_at AS TwoFactorCodeExpiresAt,
                         two_factor_backup_codes AS TwoFactorBackupCodes
                  FROM users WHERE id = @Id", new { Id = userId });

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!user.TwoFactorEnabled)
                return BadRequest(new { message = "2FA is not enabled" });

            bool isValid = false;
            
            if (user.TwoFactorMethod == "totp" && !string.IsNullOrEmpty(user.TwoFactorSecret))
            {
                var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
                isValid = _twoFactorService.VerifyTotpCode(secret, request.Code);
            }
            else if (user.TwoFactorMethod == "email")
            {
                isValid = _twoFactorService.IsEmailCodeValid(
                    user.TwoFactorEmailCode ?? "", 
                    user.TwoFactorCodeExpiresAt, 
                    request.Code);
            }

            if (!isValid && !string.IsNullOrEmpty(user.TwoFactorBackupCodes))
            {
                isValid = _twoFactorService.VerifyBackupCode(user.TwoFactorBackupCodes, request.Code);
                
                if (isValid)
                {
                    _logger.LogWarning("User {UserId} used backup code to disable 2FA", userId);
                }
            }

            if (!isValid)
                return BadRequest(new { message = "Invalid verification code" });

            await connection.ExecuteAsync(
                @"UPDATE users 
                  SET two_factor_enabled = false,
                      two_factor_method = NULL,
                      two_factor_secret = NULL,
                      two_factor_backup_codes = NULL,
                      two_factor_email_code = NULL,
                      two_factor_code_expires_at = NULL
                  WHERE id = @Id",
                new { Id = userId });

            _logger.LogInformation("2FA disabled for user {UserId}", userId);
            return Ok(new { message = "2FA disabled successfully" });
        }

        // POST: api/two-factor/send-email-code
        [HttpPost("send-email-code")]
        public async Task<IActionResult> SendEmailCode([FromBody] SendEmailCodeRequest request)
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                @"SELECT id AS Id, email AS Email,
                         two_factor_enabled AS TwoFactorEnabled,
                         two_factor_method AS TwoFactorMethod
                  FROM users WHERE login_name = @LoginName",
                new { LoginName = request.Username });

            if (user == null || user.TwoFactorMethod != "email" || !user.TwoFactorEnabled)
                return BadRequest(new { message = "Email 2FA not configured" });

            var code = _twoFactorService.GenerateEmailCode();
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            await connection.ExecuteAsync(
                @"UPDATE users 
                  SET two_factor_email_code = @Code,
                      two_factor_code_expires_at = @ExpiresAt
                  WHERE id = @Id",
                new { Code = code, ExpiresAt = expiresAt, Id = user.Id });

            await _twoFactorService.SendEmailCodeAsync(user.Email, code);

            _logger.LogInformation("Email 2FA code sent to user {UserId}", user.Id);
            return Ok(new { message = "Verification code sent to your email" });
        }

        // GET: api/two-factor/status
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "User not authenticated" });

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                @"SELECT two_factor_enabled AS TwoFactorEnabled,
                         two_factor_method AS TwoFactorMethod
                  FROM users WHERE id = @Id",
                new { Id = userId });

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(new
            {
                enabled = user.TwoFactorEnabled,
                method = user.TwoFactorMethod
            });
        }

        private int? GetCurrentUserId()
        {
            if (HttpContext.Items.TryGetValue("UserId", out var userId))
                return userId as int?;
            
            if (HttpContext.Request.Headers.TryGetValue("X-USER-ID", out var header) &&
                int.TryParse(header, out var id))
                return id;

            return null;
        }
    }

    public class SendEmailCodeRequest
    {
        public string Username { get; set; } = string.Empty;
    }
}
