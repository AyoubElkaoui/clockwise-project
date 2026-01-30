using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Data;
using FirebirdSql.Data.FirebirdClient;
using Microsoft.Extensions.Logging;
using Dapper;

namespace ClockwiseProject.Backend.Services
{
    public class VacationService
    {
        private readonly IVacationRepository _vacationRepository;
        private readonly IFirebirdDataRepository _firebirdRepository;
        private readonly FirebirdConnectionFactory _firebirdConnectionFactory;
        private readonly PostgreSQLConnectionFactory _postgresConnectionFactory;
        private readonly ILogger<VacationService> _logger;

        public VacationService(
            IVacationRepository vacationRepository,
            IFirebirdDataRepository firebirdRepository,
            FirebirdConnectionFactory firebirdConnectionFactory,
            PostgreSQLConnectionFactory postgresConnectionFactory,
            ILogger<VacationService> logger)
        {
            _vacationRepository = vacationRepository;
            _firebirdRepository = firebirdRepository;
            _firebirdConnectionFactory = firebirdConnectionFactory;
            _postgresConnectionFactory = postgresConnectionFactory;
            _logger = logger;
        }

        public async Task<IEnumerable<VacationRequest>> GetAllVacationRequestsAsync()
        {
            return await _vacationRepository.GetAllAsync();
        }

        public async Task<IEnumerable<VacationRequest>> GetVacationRequestsByUserIdAsync(int userId)
        {
            return await _vacationRepository.GetByUserIdAsync(userId);
        }

        public async Task<IEnumerable<VacationRequest>> GetVacationRequestsByMedewGcIdAsync(int medewGcId)
        {
            return await _vacationRepository.GetByMedewGcIdAsync(medewGcId);
        }

        public async Task<VacationRequest> GetVacationRequestByIdAsync(int id)
        {
            return await _vacationRepository.GetByIdAsync(id);
        }

        public async Task AddVacationRequestAsync(VacationRequest vacationRequest)
        {
            await _vacationRepository.AddAsync(vacationRequest);
            
            // If status is SUBMITTED, update vacation balance (add to pending)
            if (vacationRequest.Status?.ToUpper() == "SUBMITTED")
            {
                await UpdateVacationBalanceAsync(vacationRequest.UserId, vacationRequest.StartDate.Year, 
                    pendingDelta: vacationRequest.TotalDays * 8, // Add to pending
                    usedDelta: 0);
            }
        }

        public async Task UpdateVacationRequestAsync(VacationRequest vacationRequest)
        {
            await _vacationRepository.UpdateAsync(vacationRequest);
        }

        public async Task DeleteVacationRequestAsync(int id)
        {
            await _vacationRepository.DeleteAsync(id);
        }

        // Business logic for approving/rejecting
        public async Task ApproveVacationRequestAsync(int id, string managerComment, int reviewedBy)
        {
            var request = await _vacationRepository.GetByIdAsync(id);
            if (request == null)
            {
                _logger.LogWarning("Vacation request {Id} not found", id);
                return;
            }

            _logger.LogInformation("Approving vacation request {Id} for user {UserId}", id, request.UserId);

            // Update status in PostgreSQL FIRST (most important)
            request.Status = "approved";
            request.RejectionReason = managerComment;
            request.ReviewedAt = DateTime.Now;
            request.ReviewedBy = reviewedBy;
            await _vacationRepository.UpdateAsync(request);
            _logger.LogInformation("Updated vacation request {Id} status to approved in PostgreSQL", id);

            // Update vacation balance (non-critical)
            try
            {
                await UpdateVacationBalanceAsync(request.UserId, request.StartDate.Year,
                    pendingDelta: -request.TotalDays * 8,
                    usedDelta: request.TotalDays * 8);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update vacation balance for request {Id}, continuing anyway", id);
            }

            // Write to Firebird (optional - don't fail approve if Firebird is unavailable)
            try
            {
                var firebirdGcIds = await WriteVacationToFirebirdAsync(request);
                _logger.LogInformation("Created {Count} Firebird entries for vacation request {Id}",
                    firebirdGcIds.Count, id);

                request.FirebirdGcIds = firebirdGcIds.ToArray();
                await _vacationRepository.UpdateAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write vacation request {Id} to Firebird - approve still succeeded in PostgreSQL", id);
            }
        }

        public async Task RejectVacationRequestAsync(int id, string managerComment, int reviewedBy)
        {
            var request = await _vacationRepository.GetByIdAsync(id);
            if (request != null)
            {
                request.Status = "rejected";
                request.RejectionReason = managerComment;
                request.ReviewedAt = DateTime.Now;
                request.ReviewedBy = reviewedBy;

                // Update PostgreSQL FIRST
                await _vacationRepository.UpdateAsync(request);
                _logger.LogInformation("Rejected vacation request {Id} in PostgreSQL", id);

                // Update vacation balance (non-critical)
                try
                {
                    await UpdateVacationBalanceAsync(request.UserId, request.StartDate.Year,
                        pendingDelta: -request.TotalDays * 8,
                        usedDelta: 0);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to update vacation balance for rejected request {Id}", id);
                }
            }
        }

        /// <summary>
        /// Writes approved vacation request to Firebird AT_URENBREG table.
        /// Creates one entry per working day with 8 hours each.
        /// </summary>
        private async Task<List<int>> WriteVacationToFirebirdAsync(VacationRequest request)
        {
            var createdGcIds = new List<int>();

            // First get full request details from PostgreSQL to get medew_gc_id and taak_gc_id
            using var pgConnection = _postgresConnectionFactory.CreateConnection();
            var pgRequest = await pgConnection.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT medew_gc_id, taak_gc_id, user_id, start_date, end_date, description, total_hours
                FROM leave_requests_workflow 
                WHERE id = @Id", new { Id = request.Id });

            if (pgRequest == null)
            {
                throw new Exception($"Could not find vacation request {request.Id} in PostgreSQL");
            }

            var medewGcId = (int)pgRequest.medew_gc_id;
            var taakGcId = (int)pgRequest.taak_gc_id;

            using var connection = _firebirdConnectionFactory.CreateConnection();
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            try
            {
                // Get active period (URENPER_GC_ID) - use the most recent period that covers the vacation dates
                // Note: Firebird columns are BEGINDATUM and EINDDATUM, parameters must match or be prefixed
                var getPeriodSql = @"
                    SELECT FIRST 1 GC_ID
                    FROM AT_URENPER
                    WHERE BEGINDATUM <= @VacStart AND EINDDATUM >= @VacEnd
                    ORDER BY BEGINDATUM DESC";

                var urenperGcId = await connection.ExecuteScalarAsync<int?>(
                    getPeriodSql,
                    new { VacStart = request.StartDate, VacEnd = request.EndDate },
                    transaction);

                if (!urenperGcId.HasValue)
                {
                    throw new Exception($"Could not find matching period for vacation dates {request.StartDate} to {request.EndDate}");
                }

                // Ensure AT_URENSTAT record exists
                var documentGcId = await EnsureDocumentExistsAsync(connection, medewGcId, urenperGcId.Value, transaction);

                // Get next regel nr
                var regelNr = await GetNextRegelNrAsync(connection, documentGcId, transaction);

                // Calculate working days and insert one entry per day
                var currentDate = request.StartDate;
                while (currentDate <= request.EndDate)
                {
                    // Skip weekends (Saturday = 6, Sunday = 0)
                    if (currentDate.DayOfWeek != DayOfWeek.Saturday && currentDate.DayOfWeek != DayOfWeek.Sunday)
                    {
                        var nextGcId = await GetNextGcIdAsync(connection, transaction);

                        var insertSql = @"
                            INSERT INTO AT_URENBREG (
                                GC_ID, DOCUMENT_GC_ID, GC_REGEL_NR, DATUM, AANTAL, 
                                TAAK_GC_ID, WERK_GC_ID, MEDEW_GC_ID, GC_OMSCHRIJVING
                            ) VALUES (
                                @GcId, @DocumentGcId, @GcRegelNr, @Datum, @Aantal,
                                @TaakGcId, NULL, @MedewGcId, @GcOmschrijving
                            )";

                        await connection.ExecuteAsync(insertSql, new
                        {
                            GcId = nextGcId,
                            DocumentGcId = documentGcId,
                            GcRegelNr = regelNr++,
                            Datum = currentDate,
                            Aantal = 8.0m, // 8 hours per working day
                            TaakGcId = taakGcId,
                            MedewGcId = medewGcId,
                            GcOmschrijving = $"Vakantie: {request.Notes ?? "Goedgekeurd door manager"}"
                        }, transaction);

                        createdGcIds.Add(nextGcId);
                        _logger.LogInformation("Created Firebird entry GC_ID {GcId} for date {Date}", nextGcId, currentDate);
                    }

                    currentDate = currentDate.AddDays(1);
                }

                transaction.Commit();
                _logger.LogInformation("Successfully wrote {Count} vacation entries to Firebird for request {RequestId}", 
                    createdGcIds.Count, request.Id);
                return createdGcIds;
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                _logger.LogError(ex, "Failed to write vacation to Firebird, transaction rolled back");
                throw;
            }
        }

        private async Task<int> EnsureDocumentExistsAsync(FbConnection connection, int medewGcId, int urenperGcId, FbTransaction transaction)
        {
            // Check if AT_URENSTAT record exists
            var checkSql = @"
                SELECT FIRST 1 DOCUMENT_GC_ID 
                FROM AT_URENSTAT 
                WHERE MEDEW_GC_ID = @MedewGcId AND URENPER_GC_ID = @UrenperGcId";
            
            var existingDocId = await connection.ExecuteScalarAsync<int?>(
                checkSql, 
                new { MedewGcId = medewGcId, UrenperGcId = urenperGcId }, 
                transaction);

            if (existingDocId.HasValue)
            {
                return existingDocId.Value;
            }

            // Create new AT_URENSTAT record
            var getNextDocIdSql = "SELECT GEN_ID(AT_URENSTAT_GEN, 1) FROM RDB$DATABASE";
            var newDocId = await connection.ExecuteScalarAsync<int>(getNextDocIdSql, transaction: transaction);

            var insertSql = @"
                INSERT INTO AT_URENSTAT (DOCUMENT_GC_ID, MEDEW_GC_ID, URENPER_GC_ID, GEEXPORTEERD_JN, TVT_JN, DATUM) 
                VALUES (@DocumentGcId, @MedewGcId, @UrenperGcId, 'N', 'N', NULL)";
            
            await connection.ExecuteAsync(insertSql, new
            {
                DocumentGcId = newDocId,
                MedewGcId = medewGcId,
                UrenperGcId = urenperGcId
            }, transaction);

            _logger.LogInformation("Created new AT_URENSTAT document {DocumentGcId}", newDocId);
            return newDocId;
        }

        private async Task<int> GetNextRegelNrAsync(FbConnection connection, int documentGcId, FbTransaction transaction)
        {
            var sql = "SELECT COALESCE(MAX(GC_REGEL_NR), 0) + 1 FROM AT_URENBREG WHERE DOCUMENT_GC_ID = @DocumentGcId";
            return await connection.ExecuteScalarAsync<int>(sql, new { DocumentGcId = documentGcId }, transaction);
        }

        private async Task<int> GetNextGcIdAsync(FbConnection connection, FbTransaction transaction)
        {
            var sql = "SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG";
            return await connection.ExecuteScalarAsync<int>(sql, transaction: transaction);
        }

        /// <summary>
        /// Update vacation balance in PostgreSQL - called when vacation is submitted/approved/rejected
        /// </summary>
        private async Task UpdateVacationBalanceAsync(int medewGcId, int year, decimal pendingDelta, decimal usedDelta)
        {
            try
            {
                using var connection = _postgresConnectionFactory.CreateConnection();
                
                var sql = @"
                    INSERT INTO vacation_balance (medew_gc_id, year, total_hours, used_hours, pending_hours)
                    VALUES (@MedewGcId, @Year, 0, @UsedHours, @PendingHours)
                    ON CONFLICT (medew_gc_id, year) 
                    DO UPDATE SET
                        used_hours = vacation_balance.used_hours + @UsedHours,
                        pending_hours = vacation_balance.pending_hours + @PendingHours,
                        updated_at = CURRENT_TIMESTAMP";
                
                await connection.ExecuteAsync(sql, new
                {
                    MedewGcId = medewGcId,
                    Year = year,
                    UsedHours = usedDelta,
                    PendingHours = pendingDelta
                });
                
                _logger.LogInformation("Updated vacation balance for medew_gc_id {MedewGcId}: pending {PendingDelta}, used {UsedDelta}", 
                    medewGcId, pendingDelta, usedDelta);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating vacation balance for medew_gc_id {MedewGcId}", medewGcId);
                // Don't throw - balance update failure shouldn't stop the vacation approval
            }
        }
    }
}
