using Dapper;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Domain;
using FirebirdSql.Data.FirebirdClient;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Repositories
{
    // Firebird implementation of VacationRepository
    public class FirebirdVacationRepository : IVacationRepository
    {
        private readonly FirebirdConnectionFactory _connectionFactory;
        private readonly ILogger<FirebirdVacationRepository> _logger;

        public FirebirdVacationRepository(FirebirdConnectionFactory connectionFactory, ILogger<FirebirdVacationRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<IEnumerable<VacationRequest>> GetAllAsync()
        {
            _logger.LogInformation("Getting all vacation requests from Firebird");
            using var connection = _connectionFactory.CreateConnection();
            const string sql = @"
                SELECT r.DOCUMENT_GC_ID AS Id,
                       u.MEDEW_GC_ID AS UserId,
                       r.DATUM AS StartDate,
                       r.DATUM AS EndDate,
                       COALESCE(r.UREN, 0) AS Hours,
                       COALESCE(r.GC_OMSCHRIJVING, '') AS Reason,
                       'ingediend' AS Status
                FROM AT_URENBREG r
                INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
                INNER JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
                WHERE r.WERK_GC_ID IS NULL
                ORDER BY r.DATUM DESC";
            var result = await connection.QueryAsync<VacationRequest>(sql);
            _logger.LogInformation("Found {Count} vacation requests (without Z filter)", result.Count());
            return result;
        }

        public async Task<IEnumerable<VacationRequest>> GetByUserIdAsync(int userId)
        {
            _logger.LogInformation("Getting vacation requests for user {UserId} from Firebird", userId);
            using var connection = _connectionFactory.CreateConnection();
            const string sql = @"
                SELECT r.DOCUMENT_GC_ID AS Id,
                       u.MEDEW_GC_ID AS UserId,
                       r.DATUM AS StartDate,
                       r.DATUM AS EndDate,
                       COALESCE(r.UREN, 0) AS Hours,
                       COALESCE(r.GC_OMSCHRIJVING, '') AS Reason,
                       'ingediend' AS Status
                FROM AT_URENBREG r
                INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
                INNER JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
                WHERE r.WERK_GC_ID IS NULL
                  AND u.MEDEW_GC_ID = @UserId
                ORDER BY r.DATUM DESC";
            var result = await connection.QueryAsync<VacationRequest>(sql, new { UserId = userId });
            _logger.LogInformation("Found {Count} vacation requests for user {UserId}", result.Count(), userId);
            return result;
        }

        public async Task<VacationRequest> GetByIdAsync(int id)
        {
            _logger.LogInformation("Getting vacation request {Id} from Firebird", id);
            using var connection = _connectionFactory.CreateConnection();
            const string sql = @"
                SELECT r.DOCUMENT_GC_ID AS Id,
                   u.MEDEW_GC_ID AS UserId,
                   r.DATUM AS StartDate,
                   r.DATUM AS EndDate,
                   COALESCE(r.UREN, 0) AS Hours,
                   COALESCE(r.GC_OMSCHRIJVING, '') AS Reason,
                   'ingediend' AS Status
                FROM AT_URENBREG r
                INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
                INNER JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
                WHERE t.GC_CODE STARTING WITH 'Z'
                  AND r.WERK_GC_ID IS NULL
                  AND r.DOCUMENT_GC_ID = @Id";
            return await connection.QueryFirstOrDefaultAsync<VacationRequest>(sql, new { Id = id });
        }

        public async Task AddAsync(VacationRequest vacationRequest)
        {
            _logger.LogInformation("Adding vacation request for user {UserId}", vacationRequest.UserId);
            // For now, just log - actual implementation would require inserting into AT_URENBREG
            // This is read-only for now as per requirements
            await Task.CompletedTask;
        }

        public async Task UpdateAsync(VacationRequest vacationRequest)
        {
            _logger.LogInformation("Updating vacation request {Id}", vacationRequest.Id);
            // For now, just log - actual implementation would require updating AT_URENBREG
            await Task.CompletedTask;
        }

        public async Task DeleteAsync(int id)
        {
            _logger.LogInformation("Deleting vacation request {Id}", id);
            // For now, just log - actual implementation would require deleting from AT_URENBREG
            await Task.CompletedTask;
        }
    }
}