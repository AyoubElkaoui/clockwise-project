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

            // Hard invariants
            if (!await _repository.IsMedewActiveAsync(medewGcId))
                throw new UnauthorizedAccessException("Invalid medewGcId");

            var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);
            if (!await IsValidUrenperAsync(dto.UrenperGcId, adminisGcId))
                throw new ArgumentException("Invalid UrenperGcId");

            // Validate regels
            foreach (var regel in dto.Regels)
            {
                if (regel.Datum == default)
                    throw new ArgumentException("Datum is required");
                if (regel.Aantal <= 0 || regel.Aantal >= 24)
                    throw new ArgumentException("Aantal must be > 0 and < 24");
                if (!await IsValidTaakAsync(regel.TaakGcId))
                    throw new ArgumentException("Invalid TaakGcId");
                var taakCode = await GetTaakCodeAsync(regel.TaakGcId);
                if (taakCode != "30" && taakCode != "40")
                    throw new ArgumentException("Invalid taak for work entries");
                if (!await IsValidWerkAsync(regel.WerkGcId))
                    throw new ArgumentException("WerkGcId must be valid for work entries");
            }

            using var connection = _repository.GetConnection();
            await connection.OpenAsync();
            using var transaction = await connection.BeginTransactionAsync();

            try
            {
                var documentGcId = await _repository.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, adminisGcId);
                if (!documentGcId.HasValue)
                {
                    _logger.LogWarning("Geen document gevonden voor medew {MedewGcId}; maak nieuw document aan", medewGcId);
                    var boekDatum = await _repository.GetPeriodBeginDateAsync(dto.UrenperGcId) ?? DateTime.Today;
                    documentGcId = await _repository.CreateDocumentAsync(medewGcId, adminisGcId, boekDatum, dto.UrenperGcId, transaction);
                }

                await _repository.EnsureUrenstatAsync(documentGcId.Value, medewGcId, dto.UrenperGcId, transaction);

                var nextRegelNr = await _repository.GetNextRegelNrAsync(documentGcId.Value, transaction);

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
                    await _repository.InsertTimeEntryAsync(entry, transaction);
                }

                await transaction.CommitAsync();
                _logger.LogInformation("Inserted {Count} work entries", dto.Regels.Count);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task InsertVacationEntriesAsync(int medewGcId, BulkVacationEntryDto dto)
        {
            _logger.LogInformation("Inserting vacation entries for medew {MedewGcId}, period {UrenperGcId}", medewGcId, dto.UrenperGcId);

            // Hard invariants
            if (!await _repository.IsMedewActiveAsync(medewGcId))
                throw new UnauthorizedAccessException("Invalid medewGcId");

            var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);
            if (!await IsValidUrenperAsync(dto.UrenperGcId, adminisGcId))
                throw new ArgumentException("Invalid UrenperGcId");

            // Validate regels
            foreach (var regel in dto.Regels)
            {
                if (regel.Datum == default)
                    throw new ArgumentException("Datum is required");
                if (regel.Aantal <= 0 || regel.Aantal >= 24)
                    throw new ArgumentException("Aantal must be > 0 and < 24");
                if (!await IsValidTaakAsync(regel.TaakGcId))
                    throw new ArgumentException("Invalid TaakGcId");
                var taakCode = await GetTaakCodeAsync(regel.TaakGcId);
                if (!taakCode.StartsWith("Z"))
                    throw new ArgumentException("Invalid taak for vacation entries");
            }

            using var connection = _repository.GetConnection();
            await connection.OpenAsync();
            using var transaction = await connection.BeginTransactionAsync();

            try
            {
                var documentGcId = await _repository.GetDocumentGcIdAsync(medewGcId, dto.UrenperGcId, adminisGcId);
                if (!documentGcId.HasValue)
                {
                    _logger.LogWarning("Geen document gevonden voor medew {MedewGcId}; maak nieuw document aan", medewGcId);
                    var boekDatum = await _repository.GetPeriodBeginDateAsync(dto.UrenperGcId) ?? DateTime.Today;
                    documentGcId = await _repository.CreateDocumentAsync(medewGcId, adminisGcId, boekDatum, dto.UrenperGcId, transaction);
                }

                await _repository.EnsureUrenstatAsync(documentGcId.Value, medewGcId, dto.UrenperGcId, transaction);

                var nextRegelNr = await _repository.GetNextRegelNrAsync(documentGcId.Value, transaction);

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
                    await _repository.InsertVacationEntryAsync(entry, transaction);
                }

                await transaction.CommitAsync();
                _logger.LogInformation("Inserted {Count} vacation entries", dto.Regels.Count);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<bool> IsValidUrenperAsync(int urenperGcId, int adminisGcId)
        {
            using var connection = _repository.GetConnection();
            const string sql = "SELECT COUNT(*) FROM AT_URENPER WHERE GC_ID = @UrenperGcId AND ADMINIS_GC_ID = @AdminisGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { UrenperGcId = urenperGcId, AdminisGcId = adminisGcId });
            return count > 0;
        }

        private async Task<bool> IsValidTaakAsync(int taakGcId)
        {
            using var connection = _repository.GetConnection();
            const string sql = "SELECT COUNT(*) FROM AT_TAAK WHERE GC_ID = @TaakGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { TaakGcId = taakGcId });
            return count > 0;
        }

        private async Task<string> GetTaakCodeAsync(int taakGcId)
        {
            using var connection = _repository.GetConnection();
            const string sql = "SELECT GC_CODE FROM AT_TAAK WHERE GC_ID = @TaakGcId";
            return await connection.ExecuteScalarAsync<string>(sql, new { TaakGcId = taakGcId });
        }

        private async Task<bool> IsValidWerkAsync(int werkGcId)
        {
            using var connection = _repository.GetConnection();
            const string sql = "SELECT COUNT(*) FROM AT_WERK WHERE GC_ID = @WerkGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { WerkGcId = werkGcId });
            return count > 0;
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
