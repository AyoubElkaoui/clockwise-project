using backend.Models;
using ClockwiseProject.Backend.Data;
using Dapper;

namespace backend.Repositories
{
    public class PostgresWorkflowRepository : IWorkflowRepository
    {
        private readonly PostgreSQLConnectionFactory _connectionFactory;
        private readonly ILogger<PostgresWorkflowRepository> _logger;

        public PostgresWorkflowRepository(
            PostgreSQLConnectionFactory connectionFactory,
            ILogger<PostgresWorkflowRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<TimeEntryWorkflow> SaveDraftAsync(TimeEntryWorkflow entry)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                if (entry.Id == 0)
                {
                    // Insert new
                    var sql = @"
                        INSERT INTO time_entries_workflow
                            (medew_gc_id, urenper_gc_id, taak_gc_id, werk_gc_id, datum, aantal, omschrijving, status, created_at, updated_at)
                        VALUES
                            (@MedewGcId, @UrenperGcId, @TaakGcId, @WerkGcId, @Datum, @Aantal, @Omschrijving, 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id, medew_gc_id, urenper_gc_id, taak_gc_id, werk_gc_id, datum, aantal, omschrijving, status, created_at, updated_at, submitted_at, reviewed_at, reviewed_by, rejection_reason, firebird_gc_id";

                    return await connection.QuerySingleAsync<TimeEntryWorkflow>(sql, entry);
                }
                else
                {
                    // Update existing
                    var sql = @"
                        UPDATE time_entries_workflow
                        SET taak_gc_id = @TaakGcId,
                            werk_gc_id = @WerkGcId,
                            datum = @Datum,
                            aantal = @Aantal,
                            omschrijving = @Omschrijving,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = @Id
                        RETURNING id, medew_gc_id, urenper_gc_id, taak_gc_id, werk_gc_id, datum, aantal, omschrijving, status, created_at, updated_at, submitted_at, reviewed_at, reviewed_by, rejection_reason, firebird_gc_id";

                    return await connection.QuerySingleAsync<TimeEntryWorkflow>(sql, entry);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving draft");
                throw;
            }
        }

        public async Task<List<TimeEntryWorkflow>> GetDraftsByEmployeeAsync(int medewGcId, int urenperGcId)
        {
            return await GetEntriesByStatusAsync(medewGcId, urenperGcId, "DRAFT");
        }

        public async Task<List<TimeEntryWorkflow>> GetSubmittedByEmployeeAsync(int medewGcId, int urenperGcId)
        {
            return await GetEntriesByStatusAsync(medewGcId, urenperGcId, "SUBMITTED");
        }

        public async Task<List<TimeEntryWorkflow>> GetAllSubmittedAsync(int urenperGcId)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS MedewGcId,
                        urenper_gc_id AS UrenperGcId,
                        taak_gc_id AS TaakGcId,
                        werk_gc_id AS WerkGcId,
                        datum AS Datum,
                        aantal AS Aantal,
                        omschrijving AS Omschrijving,
                        status AS Status,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS RejectionReason,
                        firebird_gc_id AS FirebirdGcId
                    FROM time_entries_workflow
                    WHERE urenper_gc_id = @UrenperGcId
                      AND status = 'SUBMITTED'
                    ORDER BY submitted_at ASC";

                var result = await connection.QueryAsync<TimeEntryWorkflow>(sql, new { UrenperGcId = urenperGcId });
                return result.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all submitted entries");
                throw;
            }
        }

        public async Task<List<TimeEntryWorkflow>> GetApprovedByEmployeeAsync(int medewGcId, int urenperGcId)
        {
            return await GetEntriesByStatusAsync(medewGcId, urenperGcId, "APPROVED");
        }

        public async Task<List<TimeEntryWorkflow>> GetRejectedByEmployeeAsync(int medewGcId, int urenperGcId)
        {
            return await GetEntriesByStatusAsync(medewGcId, urenperGcId, "REJECTED");
        }

        public async Task<TimeEntryWorkflow?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS MedewGcId,
                        urenper_gc_id AS UrenperGcId,
                        taak_gc_id AS TaakGcId,
                        werk_gc_id AS WerkGcId,
                        datum AS Datum,
                        aantal AS Aantal,
                        omschrijving AS Omschrijving,
                        status AS Status,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS RejectionReason,
                        firebird_gc_id AS FirebirdGcId
                    FROM time_entries_workflow
                    WHERE id = @Id";

                return await connection.QuerySingleOrDefaultAsync<TimeEntryWorkflow>(sql, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entry by id {Id}", id);
                throw;
            }
        }

        public async Task<List<TimeEntryWorkflow>> GetByIdsAsync(List<int> ids)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS MedewGcId,
                        urenper_gc_id AS UrenperGcId,
                        taak_gc_id AS TaakGcId,
                        werk_gc_id AS WerkGcId,
                        datum AS Datum,
                        aantal AS Aantal,
                        omschrijving AS Omschrijving,
                        status AS Status,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS RejectionReason,
                        firebird_gc_id AS FirebirdGcId
                    FROM time_entries_workflow
                    WHERE id = ANY(@Ids)";

                var result = await connection.QueryAsync<TimeEntryWorkflow>(sql, new { Ids = ids.ToArray() });
                return result.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entries by ids");
                throw;
            }
        }

        public async Task<TimeEntryWorkflow?> FindDuplicateAsync(int medewGcId, DateTime datum, int taakGcId, int? werkGcId, int urenperGcId)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS MedewGcId,
                        urenper_gc_id AS UrenperGcId,
                        taak_gc_id AS TaakGcId,
                        werk_gc_id AS WerkGcId,
                        datum AS Datum,
                        aantal AS Aantal,
                        omschrijving AS Omschrijving,
                        status AS Status,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS RejectionReason,
                        firebird_gc_id AS FirebirdGcId
                    FROM time_entries_workflow
                    WHERE medew_gc_id = @MedewGcId
                      AND urenper_gc_id = @UrenperGcId
                      AND datum = @Datum
                      AND taak_gc_id = @TaakGcId
                      AND (werk_gc_id = @WerkGcId OR (werk_gc_id IS NULL AND @WerkGcId IS NULL))
                      AND status IN ('DRAFT', 'SUBMITTED')
                    LIMIT 1";

                return await connection.QuerySingleOrDefaultAsync<TimeEntryWorkflow>(sql, new
                {
                    MedewGcId = medewGcId,
                    UrenperGcId = urenperGcId,
                    Datum = datum,
                    TaakGcId = taakGcId,
                    WerkGcId = werkGcId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding duplicate");
                throw;
            }
        }

        public async Task UpdateStatusAsync(int id, string status, DateTime? statusChangedAt = null)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    UPDATE time_entries_workflow
                    SET status = @Status,
                        updated_at = CURRENT_TIMESTAMP";

                if (status == "SUBMITTED")
                {
                    sql += ", submitted_at = COALESCE(@StatusChangedAt, CURRENT_TIMESTAMP)";
                }
                else if (status == "APPROVED" || status == "REJECTED")
                {
                    sql += ", reviewed_at = COALESCE(@StatusChangedAt, CURRENT_TIMESTAMP)";
                }

                sql += " WHERE id = @Id";

                await connection.ExecuteAsync(sql, new { Id = id, Status = status, StatusChangedAt = statusChangedAt });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating status for entry {Id}", id);
                throw;
            }
        }

        public async Task UpdateEntriesAsync(List<TimeEntryWorkflow> entries)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    UPDATE time_entries_workflow
                    SET taak_gc_id = @TaakGcId,
                        werk_gc_id = @WerkGcId,
                        datum = @Datum,
                        aantal = @Aantal,
                        omschrijving = @Omschrijving,
                        status = @Status,
                        submitted_at = @SubmittedAt,
                        reviewed_at = @ReviewedAt,
                        reviewed_by = @ReviewedBy,
                        rejection_reason = @RejectionReason,
                        firebird_gc_id = @FirebirdGcId,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = @Id";

                await connection.ExecuteAsync(sql, entries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating entries");
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = "DELETE FROM time_entries_workflow WHERE id = @Id AND status = 'DRAFT'";

                await connection.ExecuteAsync(sql, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting entry {Id}", id);
                throw;
            }
        }

        // Helper method
        private async Task<List<TimeEntryWorkflow>> GetEntriesByStatusAsync(int medewGcId, int urenperGcId, string status)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();

                var sql = @"
                    SELECT
                        id AS Id,
                        medew_gc_id AS MedewGcId,
                        urenper_gc_id AS UrenperGcId,
                        taak_gc_id AS TaakGcId,
                        werk_gc_id AS WerkGcId,
                        datum AS Datum,
                        aantal AS Aantal,
                        omschrijving AS Omschrijving,
                        status AS Status,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt,
                        submitted_at AS SubmittedAt,
                        reviewed_at AS ReviewedAt,
                        reviewed_by AS ReviewedBy,
                        rejection_reason AS RejectionReason,
                        firebird_gc_id AS FirebirdGcId
                    FROM time_entries_workflow
                    WHERE medew_gc_id = @MedewGcId
                      AND urenper_gc_id = @UrenperGcId
                      AND status = @Status
                    ORDER BY datum DESC, created_at DESC";

                var result = await connection.QueryAsync<TimeEntryWorkflow>(sql, new
                {
                    MedewGcId = medewGcId,
                    UrenperGcId = urenperGcId,
                    Status = status
                });

                return result.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entries by status");
                throw;
            }
        }
    }
}
