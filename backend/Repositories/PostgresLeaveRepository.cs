using Dapper;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Data;
using ClockwiseProject.Backend.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Repositories
{
    public class PostgresLeaveRepository : IVacationRepository
    {
        private readonly PostgreSQLConnectionFactory _connectionFactory;
        private readonly FirebirdConnectionFactory _firebirdConnectionFactory;
        private readonly SyntessOptions _syntess;
        private readonly ILogger<PostgresLeaveRepository> _logger;

        public PostgresLeaveRepository(
            PostgreSQLConnectionFactory connectionFactory,
            FirebirdConnectionFactory firebirdConnectionFactory,
            IConfiguration configuration,
            ILogger<PostgresLeaveRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _firebirdConnectionFactory = firebirdConnectionFactory;
            _syntess = SyntessOptions.FromConfiguration(configuration);
            _logger = logger;
        }

        /// <summary>
        /// Zoekt de AT_TAAK.GC_ID van de verlofsoort uit de aanvraag. <paramref name="vacationType"/> is
        /// de GC_CODE (bijv. "Z03") of een numerieke GC_ID; in beide gevallen moet de code met de
        /// geconfigureerde verlofprefix beginnen. Gooit een fout als de taak niet bestaat.
        /// </summary>
        private async Task<int> ResolveLeaveTaskGcIdAsync(string? vacationType)
        {
            var value = vacationType?.Trim();
            if (string.IsNullOrEmpty(value))
                throw new InvalidOperationException("Verlofsoort (vacationType) ontbreekt in de aanvraag");

            using var fb = _firebirdConnectionFactory.CreateConnection();
            await fb.OpenAsync();

            int? gcId;
            if (int.TryParse(value, out var numericId))
            {
                gcId = await fb.ExecuteScalarAsync<int?>(
                    "SELECT GC_ID FROM AT_TAAK WHERE GC_ID = @GcId AND GC_CODE STARTING WITH @Prefix",
                    new { GcId = numericId, Prefix = _syntess.LeaveTaskPrefix });
            }
            else
            {
                gcId = await fb.ExecuteScalarAsync<int?>(
                    "SELECT FIRST 1 GC_ID FROM AT_TAAK WHERE UPPER(TRIM(GC_CODE)) = UPPER(@Code) AND GC_CODE STARTING WITH @Prefix ORDER BY GC_ID",
                    new { Code = value, Prefix = _syntess.LeaveTaskPrefix });
            }

            if (!gcId.HasValue)
                throw new InvalidOperationException(
                    $"Verloftaak '{value}' niet gevonden in Syntess (AT_TAAK met GC_CODE-prefix '{_syntess.LeaveTaskPrefix}')");

            return gcId.Value;
        }

        public async Task<IEnumerable<VacationRequest>> GetAllAsync()
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                // First check if table exists
                var tableExists = await connection.ExecuteScalarAsync<bool>(@"
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'leave_requests_workflow'
                    )");

                if (!tableExists)
                {
                    _logger.LogWarning("Table leave_requests_workflow does not exist, returning empty list");
                    return new List<VacationRequest>();
                }

                var sql = @"
                    SELECT
                        l.id AS Id,
                        l.medew_gc_id AS UserId,
                        l.start_date AS StartDate,
                        l.end_date AS EndDate,
                        'vacation' AS VacationType,
                        ROUND(l.total_hours / 8.0, 1) AS TotalDays,
                        COALESCE(l.description, '') AS Notes,
                        COALESCE(l.status, 'DRAFT') AS Status,
                        l.created_at AS CreatedAt,
                        l.submitted_at AS SubmittedAt,
                        l.reviewed_at AS ReviewedAt,
                        l.reviewed_by AS ReviewedBy,
                        COALESCE(l.rejection_reason, '') AS RejectionReason,
                        l.updated_at AS UpdatedAt,
                        l.firebird_gc_ids AS FirebirdGcIds,
                        u.first_name AS UserFirstName,
                        u.last_name AS UserLastName,
                        u.email AS UserEmail
                    FROM leave_requests_workflow l
                    LEFT JOIN users u ON l.medew_gc_id = u.medew_gc_id
                    ORDER BY l.created_at DESC";

                var result = await connection.QueryAsync<VacationRequest>(sql);
                _logger.LogInformation("Found {Count} vacation requests", result.Count());
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all vacation requests");
                return new List<VacationRequest>(); // Return empty list instead of throwing
            }
        }

        public async Task<IEnumerable<VacationRequest>> GetByUserIdAsync(int userId)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                // First check if table exists
                var tableExists = await connection.ExecuteScalarAsync<bool>(@"
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'leave_requests_workflow'
                    )");

                if (!tableExists)
                {
                    _logger.LogWarning("Table leave_requests_workflow does not exist, returning empty list");
                    return new List<VacationRequest>();
                }

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS UserId,
                        start_date AS StartDate,
                        end_date AS EndDate,
                        'vacation' AS VacationType,
                        ROUND(total_hours / 8.0, 1) AS TotalDays,
                        COALESCE(description, '') AS Notes,
                        COALESCE(status, 'DRAFT') AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        COALESCE(rejection_reason, '') AS RejectionReason,
                        updated_at AS UpdatedAt,
                        firebird_gc_ids AS FirebirdGcIds
                    FROM leave_requests_workflow
                    WHERE medew_gc_id = @UserId
                    ORDER BY created_at DESC";

                var result = await connection.QueryAsync<VacationRequest>(sql, new { UserId = userId });
                _logger.LogInformation("Found {Count} vacation requests for user {UserId}", result.Count(), userId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vacation requests for user {UserId}", userId);
                return new List<VacationRequest>(); // Return empty list instead of throwing
            }
        }

        public async Task<IEnumerable<VacationRequest>> GetByMedewGcIdAsync(int medewGcId)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                // First check if table exists
                var tableExists = await connection.ExecuteScalarAsync<bool>(@"
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'leave_requests_workflow'
                    )");

                if (!tableExists)
                {
                    _logger.LogWarning("Table leave_requests_workflow does not exist, returning empty list");
                    return new List<VacationRequest>();
                }

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS UserId,
                        start_date AS StartDate,
                        end_date AS EndDate,
                        'vacation' AS VacationType,
                        ROUND(total_hours / 8.0, 1) AS TotalDays,
                        COALESCE(total_hours, 0) AS Hours,
                        COALESCE(description, '') AS Reason,
                        COALESCE(description, '') AS Notes,
                        COALESCE(status, 'DRAFT') AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        COALESCE(rejection_reason, '') AS RejectionReason,
                        updated_at AS UpdatedAt,
                        firebird_gc_ids AS FirebirdGcIds
                    FROM leave_requests_workflow
                    WHERE medew_gc_id = @MedewGcId
                    ORDER BY created_at DESC";

                var result = await connection.QueryAsync<VacationRequest>(sql, new { MedewGcId = medewGcId });
                _logger.LogInformation("Found {Count} vacation requests for medewGcId {MedewGcId}", result.Count(), medewGcId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vacation requests for medewGcId {MedewGcId}", medewGcId);
                return new List<VacationRequest>(); // Return empty list instead of throwing
            }
        }

        public async Task<VacationRequest?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS UserId,
                        start_date AS StartDate,
                        end_date AS EndDate,
                        'vacation' AS VacationType,
                        ROUND(total_hours / 8.0, 1) AS TotalDays,
                        COALESCE(description, '') AS Notes,
                        COALESCE(status, 'DRAFT') AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        COALESCE(rejection_reason, '') AS RejectionReason,
                        updated_at AS UpdatedAt,
                        firebird_gc_ids AS FirebirdGcIds
                    FROM leave_requests_workflow
                    WHERE id = @Id";

                return await connection.QueryFirstOrDefaultAsync<VacationRequest>(sql, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vacation request {Id}", id);
                throw;
            }
        }

        public async Task AddAsync(VacationRequest vacationRequest)
        {
            try
            {
                // Verlof wordt op de verloftaak (Z-code) geboekt, nooit op een werktaak.
                var taakGcId = await ResolveLeaveTaskGcIdAsync(vacationRequest.VacationType);

                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    INSERT INTO leave_requests_workflow (
                        medew_gc_id,
                        user_id,
                        taak_gc_id,
                        start_date,
                        end_date,
                        total_hours,
                        description,
                        status,
                        submitted_at
                    ) VALUES (
                        (SELECT medew_gc_id FROM users WHERE id = @UserId),
                        @UserId,
                        @TaakGcId,
                        @StartDate,
                        @EndDate,
                        @TotalDays * @HoursPerDay,
                        @Notes,
                        'SUBMITTED',
                        NOW()
                    )
                    RETURNING id";

                var id = await connection.ExecuteScalarAsync<int>(sql, new
                {
                    vacationRequest.UserId,
                    TaakGcId = taakGcId,
                    vacationRequest.StartDate,
                    vacationRequest.EndDate,
                    vacationRequest.TotalDays,
                    HoursPerDay = _syntess.HoursPerDay,
                    vacationRequest.Notes
                });

                vacationRequest.Id = id;
                vacationRequest.Status = "SUBMITTED";
                vacationRequest.CreatedAt = DateTime.Now;
                vacationRequest.SubmittedAt = DateTime.Now;

                _logger.LogInformation("Created vacation request {Id} for user {UserId}", id, vacationRequest.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating leave request for user {UserId}", vacationRequest.UserId);
                throw;
            }
        }

        public async Task UpdateAsync(VacationRequest vacationRequest)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    UPDATE leave_requests_workflow
                    SET
                        status = @Status,
                        reviewed_at = @ReviewedAt,
                        reviewed_by = @ReviewedBy,
                        rejection_reason = @RejectionReason,
                        firebird_gc_ids = @FirebirdGcIds
                    WHERE id = @Id";

                await connection.ExecuteAsync(sql, new
                {
                    vacationRequest.Id,
                    vacationRequest.Status,
                    vacationRequest.ReviewedAt,
                    vacationRequest.ReviewedBy,
                    vacationRequest.RejectionReason,
                    vacationRequest.FirebirdGcIds
                });

                _logger.LogInformation("Updated vacation request {Id} to status {Status}", vacationRequest.Id, vacationRequest.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating vacation request {Id}", vacationRequest.Id);
                throw;
            }
        }

        public async Task<bool> TryTransitionStatusAsync(int id, IEnumerable<string> fromStatuses, string toStatus)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var from = fromStatuses.Select(s => s.ToUpperInvariant()).ToArray();
                var sql = @"
                    UPDATE leave_requests_workflow
                    SET status = @ToStatus,
                        updated_at = NOW()
                    WHERE id = @Id
                      AND UPPER(COALESCE(status, '')) = ANY(@FromStatuses)";

                var rows = await connection.ExecuteAsync(sql, new { Id = id, ToStatus = toStatus, FromStatuses = from });
                return rows == 1;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transitioning vacation request {Id} to {Status}", id, toStatus);
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = "DELETE FROM leave_requests_workflow WHERE id = @Id";
                await connection.ExecuteAsync(sql, new { Id = id });

                _logger.LogInformation("Deleted vacation request {Id}", id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting vacation request {Id}", id);
                throw;
            }
        }
    }
}
