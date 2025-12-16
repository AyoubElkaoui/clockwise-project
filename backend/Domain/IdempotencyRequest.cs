namespace ClockwiseProject.Domain
{
    public class IdempotencyRequest
    {
        public int Id { get; set; }
        public int MedewGcId { get; set; }
        public string ClientRequestId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
