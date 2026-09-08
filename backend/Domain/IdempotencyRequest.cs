namespace ClockwiseProject.Domain
{
    public class IdempotencyRequest
    {
        public int Id { get; set; }
        public int MedewGcId { get; set; }
        public string ClientRequestId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
