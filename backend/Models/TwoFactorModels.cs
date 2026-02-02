namespace backend.Models
{
    public class TwoFactorSetupRequest
    {
        public string Method { get; set; } = string.Empty; // "email" of "totp"
    }

    public class TwoFactorSetupResponse
    {
        public string Method { get; set; } = string.Empty;
        public string? Secret { get; set; }
        public string? QrCodeDataUrl { get; set; }
        public List<string>? BackupCodes { get; set; }
    }

    public class TwoFactorVerifyRequest
    {
        public string Code { get; set; } = string.Empty;
    }

    public class TwoFactorResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Token { get; set; }
    }

    public class TwoFactorDisableRequest
    {
        public string Code { get; set; } = string.Empty;
    }
}
