using OtpNet;
using QRCoder;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MailKit.Net.Smtp;
using MimeKit;

namespace backend.Services
{
    public interface ITwoFactorService
    {
        // TOTP (Authenticator App)
        string GenerateTotpSecret();
        string GenerateQrCodeDataUrl(string email, string secret, string issuer = "Clockwise");
        bool VerifyTotpCode(string secret, string code);
        
        // Email
        string GenerateEmailCode();
        Task SendEmailCodeAsync(string email, string code);
        bool IsEmailCodeValid(string storedCode, DateTime? expiresAt, string inputCode);
        
        // Backup codes
        List<string> GenerateBackupCodes(int count = 10);
        string HashBackupCodes(List<string> codes);
        bool VerifyBackupCode(string hashedCodes, string inputCode);
        
        // Encryption
        string EncryptSecret(string secret);
        string DecryptSecret(string encryptedSecret);
    }

    public class TwoFactorService : ITwoFactorService
    {
        private readonly ILogger<TwoFactorService> _logger;
        private readonly IConfiguration _configuration;
        private readonly byte[] _encryptionKey;

        public TwoFactorService(ILogger<TwoFactorService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            
            var keyString = configuration["TwoFactor:EncryptionKey"] 
                ?? "CHANGE-THIS-TO-32-CHAR-KEY!!";
            _encryptionKey = Encoding.UTF8.GetBytes(keyString.PadRight(32).Substring(0, 32));
        }

        // ===== TOTP (Authenticator App) =====
        
        public string GenerateTotpSecret()
        {
            var key = KeyGeneration.GenerateRandomKey(20);
            return Base32Encoding.ToString(key);
        }

        public string GenerateQrCodeDataUrl(string email, string secret, string issuer = "Clockwise")
        {
            var otpUrl = $"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}";
            
            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(otpUrl, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrCodeImage = qrCode.GetGraphic(20);
            
            return $"data:image/png;base64,{Convert.ToBase64String(qrCodeImage)}";
        }

        public bool VerifyTotpCode(string secret, string code)
        {
            try
            {
                var totp = new Totp(Base32Encoding.ToBytes(secret));
                return totp.VerifyTotp(code, out _, new VerificationWindow(2, 2));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying TOTP code");
                return false;
            }
        }

        // ===== Email 2FA =====
        
        public string GenerateEmailCode()
        {
            var random = new Random();
            return random.Next(100000, 999999).ToString();
        }

        public async Task SendEmailCodeAsync(string email, string code)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Clockwise", _configuration["Email:FromEmail"] ?? "noreply@clockwise.com"));
            message.To.Add(new MailboxAddress("", email));
            message.Subject = "Je 2FA Verificatiecode";
            
            message.Body = new TextPart("html")
            {
                Text = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                        <h2 style='color: #333;'>Je verificatiecode</h2>
                        <p style='color: #666;'>Gebruik deze code om in te loggen:</p>
                        <div style='background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                            <h1 style='font-size: 32px; letter-spacing: 5px; color: #2563eb; margin: 0;'>{code}</h1>
                        </div>
                        <p style='color: #666;'>Deze code verloopt over 10 minuten.</p>
                        <p style='color: #999; font-size: 12px;'>Als je niet geprobeerd hebt in te loggen, negeer deze email.</p>
                    </div>
                "
            };

            using var client = new SmtpClient();
            try
            {
                var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
                var smtpUser = _configuration["Email:SmtpUser"];
                var smtpPass = _configuration["Email:SmtpPassword"];

                await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                
                if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass))
                {
                    await client.AuthenticateAsync(smtpUser, smtpPass);
                }
                
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                _logger.LogInformation("2FA email code sent to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send 2FA email to {Email}", email);
                throw;
            }
        }

        public bool IsEmailCodeValid(string storedCode, DateTime? expiresAt, string inputCode)
        {
            if (string.IsNullOrEmpty(storedCode) || !expiresAt.HasValue)
                return false;
                
            if (DateTime.UtcNow > expiresAt.Value)
            {
                _logger.LogWarning("2FA email code expired");
                return false;
            }
            
            return storedCode == inputCode;
        }

        // ===== Backup Codes =====
        
        public List<string> GenerateBackupCodes(int count = 10)
        {
            var codes = new List<string>();
            var random = new Random();
            
            for (int i = 0; i < count; i++)
            {
                var code = $"{random.Next(1000, 9999)}-{random.Next(1000, 9999)}";
                codes.Add(code);
            }
            
            return codes;
        }

        public string HashBackupCodes(List<string> codes)
        {
            var hashedCodes = codes.Select(code => 
                Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code)))
            ).ToList();
            
            return JsonSerializer.Serialize(hashedCodes);
        }

        public bool VerifyBackupCode(string hashedCodesJson, string inputCode)
        {
            try
            {
                var hashedCodes = JsonSerializer.Deserialize<List<string>>(hashedCodesJson);
                if (hashedCodes == null) return false;
                
                var inputHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(inputCode)));
                return hashedCodes.Contains(inputHash);
            }
            catch
            {
                return false;
            }
        }

        // ===== Encryption =====
        
        public string EncryptSecret(string secret)
        {
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.GenerateIV();
            
            using var encryptor = aes.CreateEncryptor();
            var secretBytes = Encoding.UTF8.GetBytes(secret);
            var encrypted = encryptor.TransformFinalBlock(secretBytes, 0, secretBytes.Length);
            
            var result = new byte[aes.IV.Length + encrypted.Length];
            Array.Copy(aes.IV, 0, result, 0, aes.IV.Length);
            Array.Copy(encrypted, 0, result, aes.IV.Length, encrypted.Length);
            
            return Convert.ToBase64String(result);
        }

        public string DecryptSecret(string encryptedSecret)
        {
            var data = Convert.FromBase64String(encryptedSecret);
            
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            
            var iv = new byte[aes.IV.Length];
            var encrypted = new byte[data.Length - iv.Length];
            Array.Copy(data, 0, iv, 0, iv.Length);
            Array.Copy(data, iv.Length, encrypted, 0, encrypted.Length);
            
            aes.IV = iv;
            using var decryptor = aes.CreateDecryptor();
            var decrypted = decryptor.TransformFinalBlock(encrypted, 0, encrypted.Length);
            
            return Encoding.UTF8.GetString(decrypted);
        }
    }
}
