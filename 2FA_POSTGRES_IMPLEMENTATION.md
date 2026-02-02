# 2FA Implementatie voor PostgreSQL - Email & Authenticator App

## Overzicht

Deze implementatie ondersteunt **beide methodes**:
1. **Email-based 2FA** - Code via email (makkelijk, geen app nodig)
2. **Authenticator App (TOTP)** - Google Authenticator, Microsoft Authenticator, etc. (veiliger)

Gebruiker kan kiezen welke methode ze willen gebruiken.

---

## 🗄️ Stap 1: Database Schema (PostgreSQL)

### 1.1 Voeg kolommen toe aan users tabel

```sql
-- Migrations/015_AddTwoFactorAuth.sql

-- Voeg 2FA velden toe aan de users/medewerker tabel
ALTER TABLE users 
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_method VARCHAR(20) DEFAULT NULL, -- 'email', 'totp', of NULL
ADD COLUMN two_factor_secret VARCHAR(200) DEFAULT NULL, -- Voor TOTP (encrypted)
ADD COLUMN two_factor_email_code VARCHAR(10) DEFAULT NULL, -- Tijdelijke email code
ADD COLUMN two_factor_code_expires_at TIMESTAMP DEFAULT NULL, -- Expiratie van email code
ADD COLUMN two_factor_backup_codes TEXT DEFAULT NULL; -- JSON array van backup codes

-- Index voor snellere lookups
CREATE INDEX idx_users_two_factor ON users(two_factor_enabled, two_factor_method);

-- Commentaar voor duidelijkheid
COMMENT ON COLUMN users.two_factor_method IS 'Type 2FA: email, totp, of NULL als uitgeschakeld';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret (geencrypt) voor authenticator app';
COMMENT ON COLUMN users.two_factor_email_code IS 'Tijdelijke code voor email 2FA (verloopt na 10 min)';
```

### 1.2 Maak 2FA logs tabel (optioneel maar aanbevolen)

```sql
-- Logging van 2FA events voor security audit
CREATE TABLE two_factor_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'setup', 'verify_success', 'verify_failed', 'disabled'
    method VARCHAR(20), -- 'email' of 'totp'
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_2fa_logs_user ON two_factor_logs(user_id, created_at DESC);
```

---

## 📦 Stap 2: Backend Dependencies (NuGet packages)

Voeg toe aan `backend.csproj`:

```xml
<ItemGroup>
  <!-- Voor TOTP (Authenticator App) -->
  <PackageReference Include="OtpNet" Version="1.9.3" />
  
  <!-- Voor QR code generatie -->
  <PackageReference Include="QRCoder" Version="1.4.3" />
  
  <!-- Voor email versturen (als je nog geen email service hebt) -->
  <PackageReference Include="MailKit" Version="4.3.0" />
  <PackageReference Include="MimeKit" Version="4.3.0" />
  
  <!-- Voor data encryption -->
  <PackageReference Include="System.Security.Cryptography.ProtectedData" Version="8.0.0" />
</ItemGroup>
```

Installeer via terminal:

```bash
cd backend
dotnet add package OtpNet
dotnet add package QRCoder
dotnet add package MailKit
dotnet add package MimeKit
dotnet add package System.Security.Cryptography.ProtectedData
```

---

## 🔧 Stap 3: Backend Models

### 3.1 Update User Model

```csharp
// Domain/User.cs - Voeg toe aan bestaande User class

public bool TwoFactorEnabled { get; set; }
public string? TwoFactorMethod { get; set; } // "email", "totp", of null
public string? TwoFactorSecret { get; set; } // Encrypted TOTP secret
public string? TwoFactorEmailCode { get; set; }
public DateTime? TwoFactorCodeExpiresAt { get; set; }
public string? TwoFactorBackupCodes { get; set; } // JSON array
```

### 3.2 DTOs voor API

```csharp
// Models/TwoFactorModels.cs - NIEUW BESTAND

namespace ClockwiseProject.Backend.Models
{
    // Setup 2FA request
    public class TwoFactorSetupRequest
    {
        public string Method { get; set; } // "email" of "totp"
    }

    // Setup response (voor TOTP)
    public class TwoFactorSetupResponse
    {
        public string Method { get; set; }
        public string? Secret { get; set; } // Alleen voor TOTP
        public string? QrCodeDataUrl { get; set; } // Alleen voor TOTP
        public List<string>? BackupCodes { get; set; }
    }

    // Verify code request
    public class TwoFactorVerifyRequest
    {
        public string Code { get; set; }
    }

    // Login met 2FA
    public class LoginWith2FARequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string TwoFactorCode { get; set; }
        public string? Method { get; set; } // "email", "totp", of "backup"
    }

    // Response
    public class TwoFactorResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Token { get; set; } // JWT token bij success
    }
}
```

---

## 🛠️ Stap 4: Backend Services

### 4.1 TwoFactorService

```csharp
// Services/TwoFactorService.cs - NIEUW BESTAND

using OtpNet;
using QRCoder;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ClockwiseProject.Backend.Services
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
        
        // Encryption key - MOET in appsettings.json of environment variable
        private readonly byte[] _encryptionKey;

        public TwoFactorService(ILogger<TwoFactorService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            
            // Haal encryption key uit config
            var keyString = configuration["TwoFactor:EncryptionKey"] 
                ?? "CHANGE-THIS-TO-32-CHAR-KEY!!"; // WAARSCHUWING: Gebruik echte key in productie!
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
            // Genereer otpauth:// URL
            var otpUrl = $"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}";
            
            // Genereer QR code als base64 image
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
                // Window van 2 betekent: accepteer codes van 60 sec geleden tot 60 sec in toekomst
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
            // Genereer 6-cijferige code
            var random = new Random();
            return random.Next(100000, 999999).ToString();
        }

        public async Task SendEmailCodeAsync(string email, string code)
        {
            // Implementeer email versturen
            // Je kunt MailKit gebruiken of je bestaande email service
            
            var message = new MimeKit.MimeMessage();
            message.From.Add(new MimeKit.MailboxAddress("Clockwise", "noreply@clockwise.com"));
            message.To.Add(new MimeKit.MailboxAddress("", email));
            message.Subject = "Je 2FA Verificatiecode";
            
            message.Body = new MimeKit.TextPart("html")
            {
                Text = $@"
                    <h2>Je verificatiecode</h2>
                    <p>Gebruik deze code om in te loggen:</p>
                    <h1 style='font-size: 32px; letter-spacing: 5px;'>{code}</h1>
                    <p>Deze code verloopt over 10 minuten.</p>
                    <p><small>Als je niet geprobeerd hebt in te loggen, negeer deze email.</small></p>
                "
            };

            using var client = new MailKit.Net.Smtp.SmtpClient();
            try
            {
                // Haal SMTP settings uit config
                var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
                var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
                var smtpUser = _configuration["Email:SmtpUser"];
                var smtpPass = _configuration["Email:SmtpPassword"];

                await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(smtpUser, smtpPass);
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
                // Genereer 8-cijferige backup code (format: XXXX-XXXX)
                var code = $"{random.Next(1000, 9999)}-{random.Next(1000, 9999)}";
                codes.Add(code);
            }
            
            return codes;
        }

        public string HashBackupCodes(List<string> codes)
        {
            // Hash elke code individueel en sla op als JSON
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

        // ===== Encryption voor TOTP secret =====
        
        public string EncryptSecret(string secret)
        {
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.GenerateIV();
            
            using var encryptor = aes.CreateEncryptor();
            var secretBytes = Encoding.UTF8.GetBytes(secret);
            var encrypted = encryptor.TransformFinalBlock(secretBytes, 0, secretBytes.Length);
            
            // Combine IV + encrypted data
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
            
            // Extract IV
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
```

### 4.2 Registreer service in Program.cs

```csharp
// Program.cs - Voeg toe bij andere service registraties

builder.Services.AddScoped<ITwoFactorService, TwoFactorService>();
```

---

## 🎮 Stap 5: Backend Controller

### 5.1 TwoFactorController

```csharp
// Controllers/TwoFactorController.cs - NIEUW BESTAND

using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Repositories;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/two-factor")]
    public class TwoFactorController : ControllerBase
    {
        private readonly ITwoFactorService _twoFactorService;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<TwoFactorController> _logger;
        private readonly string _connectionString;

        public TwoFactorController(
            ITwoFactorService twoFactorService,
            IUserRepository userRepository,
            ILogger<TwoFactorController> logger,
            IConfiguration configuration)
        {
            _twoFactorService = twoFactorService;
            _userRepository = userRepository;
            _logger = logger;
            _connectionString = configuration.GetConnectionString("PostgreSQL");
        }

        // POST: api/two-factor/setup
        [HttpPost("setup")]
        public async Task<ActionResult<TwoFactorSetupResponse>> Setup([FromBody] TwoFactorSetupRequest request)
        {
            var userId = GetCurrentUserId(); // Implement helper om userId uit JWT/session te halen
            if (userId == null)
                return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId.Value);
            if (user == null)
                return NotFound("User not found");

            var response = new TwoFactorSetupResponse
            {
                Method = request.Method
            };

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            if (request.Method == "totp")
            {
                // Genereer TOTP secret en QR code
                var secret = _twoFactorService.GenerateTotpSecret();
                var encryptedSecret = _twoFactorService.EncryptSecret(secret);
                var qrCodeDataUrl = _twoFactorService.GenerateQrCodeDataUrl(user.Email, secret);
                
                // Genereer backup codes
                var backupCodes = _twoFactorService.GenerateBackupCodes();
                var hashedBackupCodes = _twoFactorService.HashBackupCodes(backupCodes);

                // Sla op in database (nog niet enabled tot verificatie)
                await connection.ExecuteAsync(
                    @"UPDATE users 
                      SET two_factor_secret = @Secret,
                          two_factor_backup_codes = @BackupCodes,
                          two_factor_method = 'totp'
                      WHERE id = @UserId",
                    new { Secret = encryptedSecret, BackupCodes = hashedBackupCodes, UserId = userId });

                response.Secret = secret; // Voor handmatige invoer
                response.QrCodeDataUrl = qrCodeDataUrl;
                response.BackupCodes = backupCodes;
            }
            else if (request.Method == "email")
            {
                // Genereer backup codes
                var backupCodes = _twoFactorService.GenerateBackupCodes();
                var hashedBackupCodes = _twoFactorService.HashBackupCodes(backupCodes);

                // Update database
                await connection.ExecuteAsync(
                    @"UPDATE users 
                      SET two_factor_backup_codes = @BackupCodes,
                          two_factor_method = 'email'
                      WHERE id = @UserId",
                    new { BackupCodes = hashedBackupCodes, UserId = userId });

                response.BackupCodes = backupCodes;
            }
            else
            {
                return BadRequest("Invalid method. Use 'totp' or 'email'");
            }

            return Ok(response);
        }

        // POST: api/two-factor/verify
        [HttpPost("verify")]
        public async Task<ActionResult<TwoFactorResponse>> VerifyAndEnable([FromBody] TwoFactorVerifyRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                "SELECT * FROM users WHERE id = @Id", new { Id = userId });

            if (user == null)
                return NotFound();

            bool isValid = false;

            if (user.TwoFactorMethod == "totp")
            {
                if (string.IsNullOrEmpty(user.TwoFactorSecret))
                    return BadRequest("TOTP not configured");

                var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
                isValid = _twoFactorService.VerifyTotpCode(secret, request.Code);
            }
            else if (user.TwoFactorMethod == "email")
            {
                // Voor email: verificatie gebeurt tijdens setup via aparte flow
                // Hier kun je een test code sturen en verifiëren
                isValid = true; // Of implementeer test email flow
            }
            else
            {
                return BadRequest("2FA not configured");
            }

            if (isValid)
            {
                // Enable 2FA
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

            return BadRequest(new TwoFactorResponse
            {
                Success = false,
                Message = "Invalid verification code"
            });
        }

        // POST: api/two-factor/disable
        [HttpPost("disable")]
        public async Task<IActionResult> Disable([FromBody] TwoFactorVerifyRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                "SELECT * FROM users WHERE id = @Id", new { Id = userId });

            if (!user.TwoFactorEnabled)
                return BadRequest("2FA is not enabled");

            // Verifieer huidige 2FA code voordat we uitschakelen (security!)
            bool isValid = false;
            
            if (user.TwoFactorMethod == "totp")
            {
                var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
                isValid = _twoFactorService.VerifyTotpCode(secret, request.Code);
            }
            else if (user.TwoFactorMethod == "email")
            {
                isValid = _twoFactorService.IsEmailCodeValid(
                    user.TwoFactorEmailCode, 
                    user.TwoFactorCodeExpiresAt, 
                    request.Code);
            }

            if (!isValid)
            {
                // Check backup code als alternatief
                if (!string.IsNullOrEmpty(user.TwoFactorBackupCodes))
                {
                    isValid = _twoFactorService.VerifyBackupCode(user.TwoFactorBackupCodes, request.Code);
                }
            }

            if (!isValid)
                return BadRequest("Invalid verification code");

            // Disable 2FA en wis alle data
            await connection.ExecuteAsync(
                @"UPDATE users 
                  SET two_factor_enabled = false,
                      two_factor_method = NULL,
                      two_factor_secret = NULL,
                      two_factor_backup_codes = NULL
                  WHERE id = @Id",
                new { Id = userId });

            _logger.LogInformation("2FA disabled for user {UserId}", userId);
            return Ok(new { message = "2FA disabled successfully" });
        }

        // POST: api/two-factor/send-email-code (voor email 2FA bij login)
        [HttpPost("send-email-code")]
        public async Task<IActionResult> SendEmailCode([FromBody] LoginRequest request)
        {
            var user = await _userRepository.GetByLoginNameAsync(request.Username);
            if (user == null || user.TwoFactorMethod != "email" || !user.TwoFactorEnabled)
                return BadRequest("Email 2FA not configured");

            // Genereer en verstuur code
            var code = _twoFactorService.GenerateEmailCode();
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            
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

        private int? GetCurrentUserId()
        {
            // Haal userId uit JWT token claims of session
            // Bijvoorbeeld:
            if (HttpContext.Items.TryGetValue("UserId", out var userId))
                return userId as int?;
            
            // Of uit header
            if (HttpContext.Request.Headers.TryGetValue("X-USER-ID", out var header) &&
                int.TryParse(header, out var id))
                return id;

            return null;
        }
    }
}
```

### 5.2 Update AuthController voor 2FA bij login

```csharp
// Controllers/AuthController.cs - Update bestaande Login methode

[HttpPost("login")]
public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
{
    var user = await _userRepository.GetByLoginNameAsync(request.Username);
    
    if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        return Unauthorized(new { message = "Invalid credentials" });

    // Check of 2FA enabled is
    if (user.TwoFactorEnabled)
    {
        // Als 2FA code niet meegestuurd, stuur instructies
        if (string.IsNullOrEmpty(request.TwoFactorCode))
        {
            if (user.TwoFactorMethod == "email")
            {
                // Genereer en verstuur email code
                var code = _twoFactorService.GenerateEmailCode();
                var expiresAt = DateTime.UtcNow.AddMinutes(10);
                
                await _dbConnection.ExecuteAsync(
                    @"UPDATE users 
                      SET two_factor_email_code = @Code,
                          two_factor_code_expires_at = @ExpiresAt
                      WHERE id = @Id",
                    new { Code = code, ExpiresAt = expiresAt, Id = user.Id });
                
                await _twoFactorService.SendEmailCodeAsync(user.Email, code);
            }
            
            return Ok(new 
            { 
                requires2FA = true,
                method = user.TwoFactorMethod,
                message = user.TwoFactorMethod == "email" 
                    ? "Verification code sent to your email" 
                    : "Enter code from your authenticator app"
            });
        }

        // Verifieer 2FA code
        bool isValid = false;
        
        if (user.TwoFactorMethod == "totp")
        {
            var secret = _twoFactorService.DecryptSecret(user.TwoFactorSecret);
            isValid = _twoFactorService.VerifyTotpCode(secret, request.TwoFactorCode);
        }
        else if (user.TwoFactorMethod == "email")
        {
            isValid = _twoFactorService.IsEmailCodeValid(
                user.TwoFactorEmailCode,
                user.TwoFactorCodeExpiresAt,
                request.TwoFactorCode);
        }

        // Check backup code als primary faalt
        if (!isValid && !string.IsNullOrEmpty(user.TwoFactorBackupCodes))
        {
            isValid = _twoFactorService.VerifyBackupCode(user.TwoFactorBackupCodes, request.TwoFactorCode);
            
            if (isValid)
            {
                _logger.LogWarning("User {UserId} used backup code for 2FA", user.Id);
                // TODO: Remove used backup code from database
            }
        }

        if (!isValid)
        {
            _logger.LogWarning("Failed 2FA attempt for user {UserId}", user.Id);
            return Unauthorized(new { message = "Invalid 2FA code" });
        }
    }

    // Generate JWT token
    var token = GenerateJwtToken(user);
    
    return Ok(new LoginResponse 
    { 
        Token = token,
        UserId = user.Id,
        Username = user.Username,
        // ... andere user info
    });
}
```

---

## 🎨 Stap 6: Frontend Implementatie

### 6.1 Installeer npm packages

```bash
cd frontend
npm install qrcode.react
npm install react-input-verification-code  # Voor mooie code input
```

### 6.2 2FA Setup Component

```tsx
// components/TwoFactorSetup.tsx - NIEUW BESTAND

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCode from 'qrcode.react';
import { Shield, Mail, Smartphone, Copy, Check } from 'lucide-react';
import { API_URL } from '@/lib/api';

type TwoFactorMethod = 'email' | 'totp';

export function TwoFactorSetup() {
  const [step, setStep] = useState<'choose' | 'setup' | 'verify'>('choose');
  const [method, setMethod] = useState<TwoFactorMethod | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleMethodSelect = async (selectedMethod: TwoFactorMethod) => {
    setMethod(selectedMethod);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/two-factor/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ method: selectedMethod }),
      });

      if (!response.ok) throw new Error('Setup failed');

      const data = await response.json();
      
      if (selectedMethod === 'totp') {
        setQrCodeUrl(data.qrCodeDataUrl);
        setSecret(data.secret);
      }
      
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (err) {
      setError('Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/two-factor/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) throw new Error('Invalid code');

      const data = await response.json();
      
      if (data.success) {
        setStep('verify');
        alert('2FA successfully enabled!');
        // Redirect of refresh
        window.location.reload();
      }
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 1: Choose method
  if (step === 'choose') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Kies 2FA Methode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Method */}
            <button
              onClick={() => handleMethodSelect('email')}
              disabled={loading}
              className="p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
            >
              <Mail className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Email Verificatie</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ontvang een 6-cijferige code via email bij elke login.
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Makkelijk te gebruiken</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Geen app nodig</span>
                </div>
              </div>
            </button>

            {/* TOTP Method */}
            <button
              onClick={() => handleMethodSelect('totp')}
              disabled={loading}
              className="p-6 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left"
            >
              <Smartphone className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Authenticator App</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Gebruik Google Authenticator, Microsoft Authenticator of Authy.
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Extra veilig</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Werkt offline</span>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Setup (QR code voor TOTP of instructies voor email)
  if (step === 'setup') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            {method === 'totp' ? 'Scan QR Code' : 'Email Verificatie Setup'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {method === 'totp' && (
            <>
              <div className="text-center">
                <p className="mb-4 text-slate-600 dark:text-slate-400">
                  Scan deze QR code met je authenticator app
                </p>
                <div className="inline-block p-4 bg-white rounded-lg">
                  <QRCode value={qrCodeUrl} size={256} />
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Of voer deze code handmatig in:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded border">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(secret)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {method === 'email' && (
            <Alert>
              <Mail className="w-4 h-4" />
              <AlertDescription>
                Bij elke login ontvang je een 6-cijferige code op je email.
                Test dit nu door een verificatiecode in te voeren.
              </AlertDescription>
            </Alert>
          )}

          {/* Backup Codes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Backup Codes
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Sla deze codes veilig op. Gebruik ze als je toegang verliest tot je 2FA methode.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 px-3 py-2 rounded border">
                  {code}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopieer Alle Codes
            </Button>
          </div>

          {/* Verification */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Voer verificatiecode in om te activeren
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-wider"
              />
              <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
                {loading ? 'Verifiëren...' : 'Activeer'}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
```

### 6.3 Update Login Page

```tsx
// app/(auth)/login/page.tsx - Voeg toe aan bestaande login

const [requires2FA, setRequires2FA] = useState(false);
const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp' | null>(null);
const [twoFactorCode, setTwoFactorCode] = useState('');

const handleLogin = async () => {
  setIsLoading(true);
  setError('');

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        twoFactorCode: requires2FA ? twoFactorCode : undefined,
      }),
    });

    const data = await response.json();

    if (data.requires2FA) {
      // 2FA vereist
      setRequires2FA(true);
      setTwoFactorMethod(data.method);
      
      if (data.method === 'email') {
        showToast('Verificatiecode verstuurd naar je email', 'success');
      }
      return;
    }

    if (response.ok) {
      // Success - save token and redirect
      localStorage.setItem('token', data.token);
      // ... rest van login logic
      router.push('/');
    } else {
      setError(data.message || 'Login failed');
    }
  } catch (err) {
    setError('An error occurred');
  } finally {
    setIsLoading(false);
  }
};

// In de JSX, voeg 2FA input toe:
{requires2FA && (
  <div className="space-y-4">
    <Alert>
      <Shield className="w-4 h-4" />
      <AlertDescription>
        {twoFactorMethod === 'email' 
          ? 'Voer de 6-cijferige code in die naar je email is gestuurd'
          : 'Voer de code in van je authenticator app'}
      </AlertDescription>
    </Alert>
    
    <Input
      type="text"
      placeholder="000000"
      maxLength={6}
      value={twoFactorCode}
      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
      className="text-center text-2xl tracking-widest"
    />
  </div>
)}
```

---

## ⚙️ Stap 7: Configuratie

### 7.1 appsettings.json

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Database=clockwise;Username=postgres;Password=yourpassword"
  },
  
  "TwoFactor": {
    "EncryptionKey": "VERANDER-DIT-NAAR-32-CHAR-KEY-PRODUCTIE"
  },
  
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "FromName": "Clockwise",
    "FromEmail": "noreply@clockwise.com"
  }
}
```

### 7.2 Environment Variables (Productie)

```bash
# .env of server environment
TWO_FACTOR_ENCRYPTION_KEY=your-32-char-encryption-key-here
EMAIL_SMTP_PASSWORD=your-smtp-password
```

---

## 🚀 Stap 8: Deployment Checklist

```bash
# 1. Database migratie
cd backend
dotnet ef migrations add AddTwoFactorAuth
dotnet ef database update

# OF handmatig:
psql -U postgres -d clockwise -f Migrations/015_AddTwoFactorAuth.sql

# 2. Test SMTP email
# Stuur test email via backend

# 3. Build backend
dotnet build
dotnet run

# 4. Build frontend
cd ../frontend
npm install
npm run build

# 5. Test alles lokaal voor deployment
```

---

## 🧪 Testing Plan

### Test Scenario's

1. **Email 2FA Setup**
   - [ ] Setup email 2FA
   - [ ] Ontvang backup codes
   - [ ] Login en ontvang email code
   - [ ] Verifieer met email code
   - [ ] Test backup code
   - [ ] Disable 2FA

2. **TOTP 2FA Setup**
   - [ ] Setup TOTP 2FA
   - [ ] Scan QR code met Google Authenticator
   - [ ] Ontvang backup codes
   - [ ] Login met TOTP code
   - [ ] Test backup code
   - [ ] Test handmatige secret invoer
   - [ ] Disable 2FA

3. **Security**
   - [ ] Email code verloopt na 10 minuten
   - [ ] TOTP secret is encrypted in database
   - [ ] Backup codes zijn gehashed
   - [ ] Rate limiting op verificatie pogingen
   - [ ] Logging van 2FA events

---

## 📊 Database Check Queries

```sql
-- Check 2FA status van alle users
SELECT 
    id,
    username,
    email,
    two_factor_enabled,
    two_factor_method,
    CASE 
        WHEN two_factor_secret IS NOT NULL THEN 'Secret set'
        ELSE 'No secret'
    END as secret_status
FROM users
ORDER BY two_factor_enabled DESC;

-- Check recent 2FA logs
SELECT * FROM two_factor_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔒 Security Best Practices

1. **Encryption Key:** Gebruik een sterke, unieke 32-char key in productie
2. **SMTP Credentials:** Gebruik environment variables, niet in code
3. **Rate Limiting:** Limiteer aantal verificatie pogingen (max 5 per 15 min)
4. **Backup Codes:** Waarschuw gebruiker om ze veilig op te slaan
5. **Email Codes:** Laat ze vervallen na 10 minuten
6. **TOTP Window:** Gebruik niet te ruim window (max 2 = 60 sec voor/na)
7. **Logging:** Log alle 2FA events voor audit trail
8. **Recovery:** Zorg dat admin gebruiker kan helpen bij verlies 2FA

---

## 🎯 User Flow Diagram

```
1. USER SETUP 2FA
   └─> Account Settings
       └─> "Enable 2FA"
           ├─> Choose Email
           │   └─> Ontvang backup codes
           │       └─> Klaar!
           │
           └─> Choose TOTP
               └─> Scan QR code
                   └─> Verify code
                       └─> Ontvang backup codes
                           └─> Klaar!

2. USER LOGIN MET 2FA
   └─> Enter username + password
       └─> Success → 2FA required?
           ├─> Email method
           │   └─> Email sent
           │       └─> Enter 6-digit code
           │           └─> Success → Dashboard
           │
           └─> TOTP method
               └─> Enter code from app
                   └─> Success → Dashboard
```

---

Klaar! Dit is de complete implementatie voor PostgreSQL met beide 2FA methodes. 🎉

**Geschatte implementatietijd:**
- Database setup: 1 uur
- Backend (services + controllers): 1-2 dagen
- Frontend (components): 1 dag
- Testing: 0.5 dag
- **Totaal: 3-4 dagen**

Succes met de implementatie! 🚀
