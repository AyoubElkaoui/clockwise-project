using Dapper;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Data;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Repositories
{
    public class PostgresLeaveRepository : IVacationRepository
    {
        private readonly PostgreSQLConnectionFactory _connectionFactory;
        private readonly ILogger<PostgresLeaveRepository> _logger;

        public PostgresLeaveRepository(PostgreSQLConnectionFactory connectionFactory, ILogger<PostgresLeaveRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
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
                        id AS Id,
                        user_id AS UserId,
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
                    ORDER BY created_at DESC";

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
                        user_id AS UserId,
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
                    WHERE user_id = @UserId
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
                        user_id AS UserId,
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
                        100256,
                        @StartDate,
                        @EndDate,
                        @TotalDays * 8.0,
                        @Notes,
                        'SUBMITTED',
                        NOW()
                    )
                    RETURNING id";

                var id = await connection.ExecuteScalarAsync<int>(sql, new
                {
                    vacationRequest.UserId,
                    vacationRequest.StartDate,
                    vacationRequest.EndDate,
                    vacationRequest.TotalDays,
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
