using ClockwiseProject.Backend.Data;
using ClockwiseProject.Backend.Models;
using Dapper;

namespace ClockwiseProject.Backend.Repositories
{
    public class PostgreSQLPeriodsRepository
    {
        private readonly PostgreSQLConnectionFactory _connectionFactory;
        private readonly ILogger<PostgreSQLPeriodsRepository> _logger;

        public PostgreSQLPeriodsRepository(
            PostgreSQLConnectionFactory connectionFactory,
            ILogger<PostgreSQLPeriodsRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<IEnumerable<Period>> GetPeriodsAsync(int count = 50)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                var sql = $"SELECT gc_id AS GcId, gc_code AS GcCode, begin_datum AS BeginDatum, end_datum AS EndDatum, begin_datum AS startDate, end_datum AS endDate FROM periods ORDER BY begin_datum DESC LIMIT {count}";
                var periods = await connection.QueryAsync<Period>(sql);
                _logger.LogInformation("Retrieved {Count} periods from PostgreSQL", periods.Count());
                return periods;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving periods from PostgreSQL");
                throw;
            }
        }
    }
}