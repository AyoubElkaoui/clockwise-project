using System.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend;
using ClockwiseProject.Domain;
using Dapper;

namespace ClockwiseProject.Backend.Services
{
    public class TimeEntryService
    {
        private readonly IFirebirdDataRepository _repository;
        private readonly PostgresDbContext? _postgresContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TimeEntryService> _logger;

        public TimeEntryService(IFirebirdDataRepository repository, PostgresDbContext? postgresContext, IConfiguration configuration, ILogger<TimeEntryService> logger)
        {
            _repository = repository;
            _postgresContext = postgresContext;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<IEnumerable<TimeEntry>> GetTimeEntriesAsync(int medewGcId, DateTime from, DateTime to)
        {
            _logger.LogInformation("Getting time entries for medew {MedewGcId} from {From} to {To}", medewGcId, from, to);
            return await _repository.GetTimeEntriesAsync(medewGcId, from, to);
        }

        public async Task InsertWorkEntriesAsync(int medewGcId, BulkWorkEntryDto dto)
        {
            _logger.LogInformation("Inserting work entries for medew {MedewGcId}, period {UrenperGcId}", medewGcId, dto.UrenperGcId);

            // Idempotency check - temporarily disabled for Firebird-only testing
            // var existing = await _postgresContext.IdempotencyRequests
            //     .FirstOrDefaultAsync(ir => ir.MedewGcId == medewGcId && ir.ClientRequestId == dto.ClientRequestId);
            // if (existing != null)
            // {
            //     _logger.LogInformation("Request {ClientRequestId} already processed", dto.ClientRequestId);
            //     return; // Already processed
            // }

            // Validate medew exists
            if (!await _repository.IsMedewActiveAsync(medewGcId))
                throw new UnauthorizedAccessException("Invalid medewGcId");

            // Validate rules
            foreach (var regel in dto.Regels)
            {
                if (regel.WerkGcId == null)
                    throw new ArgumentException("WerkGcId is required for work entries");
                // Check taak is work (30 or 40) - lookup GC_CODE
                var taakCode = await GetTaakCodeAsync(regel.TaakGcId);
                if (taakCode != "30" && taakCode != "40")
                    throw new ArgumentException("Invalid taak for work entries");
            }

            var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);

            try
            {
                // Claim idempotency - temporarily disabled for Firebird-only testing
                // await _postgresContext.IdempotencyRequests.AddAsync(new IdempotencyRequest
                // {
                //     MedewGcId = medewGcId,
                //     ClientRequestId = dto.ClientRequestId
                // });
                // await _postgresContext.SaveChangesAsync();

                var documentGcId = await _repository.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, adminisGcId);
                if (!documentGcId.HasValue)
                {
                    _logger.LogWarning("Geen document gevonden voor medew {MedewGcId}; maak nieuw document aan", medewGcId);
                    var boekDatum = await _repository.GetPeriodBeginDateAsync(dto.UrenperGcId) ?? DateTime.Today;
                    documentGcId = await _repository.CreateDocumentAsync(medewGcId, adminisGcId, boekDatum);
                }

                await _repository.EnsureUrenstatAsync(documentGcId.Value, medewGcId, dto.UrenperGcId);

                var nextRegelNr = await _repository.GetNextRegelNrAsync(documentGcId.Value);

                foreach (var regel in dto.Regels)
                {
                    var entry = new TimeEntry
                    {
                        DocumentGcId = documentGcId.Value,
                        TaakGcId = regel.TaakGcId,
                        WerkGcId = regel.WerkGcId,
                        MedewGcId = medewGcId,
                        KostsrtGcId = regel.KostsrtGcId,
                        BestparGcId = regel.BestparGcId,
                        GcRegelNr = nextRegelNr++,
                        GcOmschrijving = regel.GcOmschrijving,
                        Aantal = regel.Aantal,
                        Datum = regel.Datum
                    };
                    await _repository.InsertTimeEntryAsync(entry);
                }

                _logger.LogInformation("Inserted {Count} work entries", dto.Regels.Count);
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("duplicate") == true)
            {
                _logger.LogInformation("Request {ClientRequestId} already processed (duplicate)", dto.ClientRequestId);
                return; // Already processed
            }
            catch
            {
                _logger.LogError("Failed to insert work entries");
                throw;
            }
        }

        public async Task InsertVacationEntriesAsync(int medewGcId, BulkVacationEntryDto dto)
        {
            _logger.LogInformation("Inserting vacation entries for medew {MedewGcId}, period {UrenperGcId}", medewGcId, dto.UrenperGcId);

            // Idempotency check - temporarily disabled for Firebird-only testing
            // var existing = await _postgresContext.IdempotencyRequests
            //     .FirstOrDefaultAsync(ir => ir.MedewGcId == medewGcId && ir.ClientRequestId == dto.ClientRequestId);
            // if (existing != null)
            // {
            //     _logger.LogInformation("Request {ClientRequestId} already processed", dto.ClientRequestId);
            //     return; // Already processed
            // }

            // Validate medew exists
            if (!await _repository.IsMedewActiveAsync(medewGcId))
                throw new UnauthorizedAccessException("Invalid medewGcId");

            // Validate rules
            foreach (var regel in dto.Regels)
            {
                // Check taak starts with Z
                var taakCode = await GetTaakCodeAsync(regel.TaakGcId);
                if (!taakCode.StartsWith("Z"))
                    throw new ArgumentException("Invalid taak for vacation entries");
            }

            var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);

            try
            {
                // Claim idempotency - temporarily disabled for Firebird-only testing
                // await _postgresContext.IdempotencyRequests.AddAsync(new IdempotencyRequest
                // {
                //     MedewGcId = medewGcId,
                //     ClientRequestId = dto.ClientRequestId
                // });
                // await _postgresContext.SaveChangesAsync();

                var documentGcId = await _repository.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, adminisGcId);
                if (!documentGcId.HasValue)
                {
                    _logger.LogWarning("Geen document gevonden voor medew {MedewGcId}; maak nieuw document aan", medewGcId);
                    var boekDatum = await _repository.GetPeriodBeginDateAsync(dto.UrenperGcId) ?? DateTime.Today;
                    documentGcId = await _repository.CreateDocumentAsync(medewGcId, adminisGcId, boekDatum);
                }

                await _repository.EnsureUrenstatAsync(documentGcId.Value, medewGcId, dto.UrenperGcId);

                var nextRegelNr = await _repository.GetNextRegelNrAsync(documentGcId.Value);

                foreach (var regel in dto.Regels)
                {
                    var entry = new VacationEntry
                    {
                        DocumentGcId = documentGcId.Value,
                        TaakGcId = regel.TaakGcId,
                        WerkGcId = null,
                        MedewGcId = medewGcId,
                        KostsrtGcId = regel.KostsrtGcId,
                        BestparGcId = regel.BestparGcId,
                        GcRegelNr = nextRegelNr++,
                        GcOmschrijving = regel.GcOmschrijving,
                        Aantal = regel.Aantal,
                        Datum = regel.Datum
                    };
                    await _repository.InsertVacationEntryAsync(entry);
                }

                _logger.LogInformation("Inserted {Count} vacation entries", dto.Regels.Count);
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("duplicate") == true)
            {
                _logger.LogInformation("Request {ClientRequestId} already processed (duplicate)", dto.ClientRequestId);
                return; // Already processed
            }
            catch
            {
                _logger.LogError("Failed to insert vacation entries");
                throw;
            }
        }

        private async Task<string> GetTaakCodeAsync(int taakGcId)
        {
            using var connection = _repository.GetConnection();
            const string sql = "SELECT GC_CODE FROM AT_TAAK WHERE GC_ID = @TaakGcId";
            return await connection.ExecuteScalarAsync<string>(sql, new { TaakGcId = taakGcId });
        }

        private IEnumerable<TimeEntry> BuildSyntheticEntries(int medewGcId, DateTime from, DateTime to)
        {
            var entries = new List<TimeEntry>();
            var current = from;
            while (current <= to)
            {
                if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
                {
                    entries.Add(new TimeEntry
                    {
                        GcId = 0,
                        DocumentGcId = 0,
                        TaakGcId = 100256, // Montage
                        WerkGcId = 300,
                        MedewGcId = medewGcId,
                        KostsrtGcId = null,
                        BestparGcId = null,
                        GcRegelNr = 1,
                        GcOmschrijving = "Synthetic entry",
                        Aantal = 8.0m,
                        Datum = current
                    });
                }
                current = current.AddDays(1);
            }
            return entries;
        }
    }
}
