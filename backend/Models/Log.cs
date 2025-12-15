using System;

namespace backend.Models
{
    public class Log
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string Level { get; set; } = "info"; // info, warn, error
        public string Component { get; set; } = "System"; // API, DB, Validation, etc.
        public string Message { get; set; } = "";
        public string? Details { get; set; }
        public int? UserId { get; set; }
        public User? User { get; set; }
    }
}
