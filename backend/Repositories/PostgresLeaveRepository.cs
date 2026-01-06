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

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS UserId,
                        start_date AS StartDate,
                        end_date AS EndDate,
                        total_hours AS Hours,
                        description AS Reason,
                        status AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS ManagerComment
                    FROM leave_requests_workflow
                    ORDER BY created_at DESC";

                var result = await connection.QueryAsync<VacationRequest>(sql);
                _logger.LogInformation("Found {Count} leave requests", result.Count());
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all leave requests");
                throw;
            }
        }

        public async Task<IEnumerable<VacationRequest>> GetByUserIdAsync(int userId)
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
                        total_hours AS Hours,
                        description AS Reason,
                        status AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS ManagerComment
                    FROM leave_requests_workflow
                    WHERE medew_gc_id = @UserId
                    ORDER BY created_at DESC";

                var result = await connection.QueryAsync<VacationRequest>(sql, new { UserId = userId });
                _logger.LogInformation("Found {Count} leave requests for user {UserId}", result.Count(), userId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave requests for user {UserId}", userId);
                throw;
            }
        }

        public async Task<VacationRequest> GetByIdAsync(int id)
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
                        total_hours AS Hours,
                        description AS Reason,
                        status AS Status,
                        created_at AS CreatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS ManagerComment
                    FROM leave_requests_workflow
                    WHERE id = @Id";

                return await connection.QueryFirstOrDefaultAsync<VacationRequest>(sql, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave request {Id}", id);
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
                        taak_gc_id,
                        start_date,
                        end_date,
                        hours_per_day,
                        total_hours,
                        description,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        @UserId,
                        100088,  -- Default leave type (Z03 - Vakantie)
                        @StartDate,
                        @EndDate,
                        8.0,
                        @Hours,
                        @Reason,
                        'SUBMITTED',
                        NOW(),
                        NOW()
                    )
                    RETURNING id";

                var id = await connection.ExecuteScalarAsync<int>(sql, new
                {
                    vacationRequest.UserId,
                    vacationRequest.StartDate,
                    vacationRequest.EndDate,
                    vacationRequest.Hours,
                    vacationRequest.Reason
                });

                vacationRequest.Id = id;
                vacationRequest.Status = "SUBMITTED";
                vacationRequest.CreatedAt = DateTime.Now;

                _logger.LogInformation("Created leave request {Id} for user {UserId}", id, vacationRequest.UserId);
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
                        rejection_reason = @ManagerComment,
                        updated_at = NOW()
                    WHERE id = @Id";

                await connection.ExecuteAsync(sql, new
                {
                    vacationRequest.Id,
                    vacationRequest.Status,
                    vacationRequest.ReviewedAt,
                    vacationRequest.ReviewedBy,
                    vacationRequest.ManagerComment
                });

                _logger.LogInformation("Updated leave request {Id} to status {Status}", vacationRequest.Id, vacationRequest.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating leave request {Id}", vacationRequest.Id);
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

                _logger.LogInformation("Deleted leave request {Id}", id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting leave request {Id}", id);
                throw;
            }
        }
    }
}
