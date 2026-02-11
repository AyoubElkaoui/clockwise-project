using Dapper;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Domain;
using FirebirdSql.Data.FirebirdClient;
using BackendProject = ClockwiseProject.Backend.Models.Project;
using BackendProjectGroup = ClockwiseProject.Backend.Models.ProjectGroup;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Repositories
{
    public class FirebirdDataRepository : IFirebirdDataRepository
    {
        private readonly FirebirdConnectionFactory _connectionFactory;
        private readonly ILogger<FirebirdDataRepository> _logger;

        public FirebirdDataRepository(FirebirdConnectionFactory connectionFactory, ILogger<FirebirdDataRepository> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task<IEnumerable<ClockwiseProject.Domain.Company>> GetCompaniesAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS Id, GC_OMSCHRIJVING AS Name FROM AT_ADMINIS ORDER BY GC_OMSCHRIJVING";
            return await connection.QueryAsync<Company>(sql);
        }

        public async Task<bool> IsMedewActiveAsync(int medewGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT COUNT(*) FROM AT_MEDEW WHERE GC_ID = @MedewGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { MedewGcId = medewGcId });
            _logger.LogInformation("IsMedewActiveAsync: medewGcId={MedewGcId}, exists={Exists}", medewGcId, count > 0);
            return count > 0;
        }

        public async Task<IEnumerable<ClockwiseProject.Backend.Models.ProjectGroup>> GetProjectGroupsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, GC_OMSCHRIJVING AS Description FROM AT_WERKGRP ORDER BY GC_CODE";
            return await connection.QueryAsync<BackendProjectGroup>(sql);
        }

        public async Task<IEnumerable<ClockwiseProject.Backend.Models.ProjectGroup>> GetProjectGroupsByCompanyAsync(int companyId)
        {
            // Since AT_WERKGRP doesn't have company_id, return all for now
            return await GetProjectGroupsAsync();
        }

        public async Task<IEnumerable<ClockwiseProject.Backend.Models.Project>> GetProjectsByGroupAsync(int groupId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, WERKGRP_GC_ID AS WerkgrpGcId, GC_OMSCHRIJVING AS Description FROM AT_WERK WHERE WERKGRP_GC_ID = @GroupId ORDER BY GC_CODE";
            return await connection.QueryAsync<BackendProject>(sql, new { GroupId = groupId });
        }

        public async Task<IEnumerable<TaskModel>> GetWorkTasksAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode FROM AT_TAAK WHERE GC_CODE IN ('30','40') ORDER BY GC_CODE";
            return await connection.QueryAsync<TaskModel>(sql);
        }

        public async Task<IEnumerable<TaskModel>> GetVacationTasksAsync()
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, GC_OMSCHRIJVING AS Omschrijving FROM AT_TAAK WHERE GC_CODE STARTING WITH 'Z' ORDER BY GC_CODE";
                return await connection.QueryAsync<TaskModel>(sql);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get vacation tasks from Firebird, returning fallback data");
                return new List<TaskModel>
                {
                    new TaskModel { GcId = 1, GcCode = "Z03", Omschrijving = "Vakantie (ATV)" },
                    new TaskModel { GcId = 2, GcCode = "Z04", Omschrijving = "Snipperdag" },
                    new TaskModel { GcId = 3, GcCode = "Z05", Omschrijving = "Verlof eigen rekening" },
                    new TaskModel { GcId = 4, GcCode = "Z06", Omschrijving = "Bijzonder verlof" },
                    new TaskModel { GcId = 5, GcCode = "Z07", Omschrijving = "Ziekteverlof" },
                    new TaskModel { GcId = 6, GcCode = "Z08", Omschrijving = "Opbouw tijd voor tijd" },
                    new TaskModel { GcId = 7, GcCode = "Z09", Omschrijving = "Opname tijd voor tijd" }
                };
            }
        }

        public async Task<IEnumerable<TaskModel>> GetAllTasksAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = @"SELECT GC_ID AS GcId, GC_CODE AS GcCode, GC_OMSCHRIJVING AS Omschrijving
                                 FROM AT_TAAK ORDER BY GC_CODE";
            return await connection.QueryAsync<TaskModel>(sql);
        }

        public async Task<IEnumerable<Period>> GetPeriodsAsync(int count = 50)
        {
            try
            {
                using var connection = _connectionFactory.CreateConnection();
                var sql = $"SELECT FIRST {count} GC_ID AS GcId, GC_CODE AS GcCode, BEGINDATUM AS BeginDatum FROM AT_URENPER ORDER BY BEGINDATUM DESC";
                var periods = (await connection.QueryAsync<Period>(sql)).ToList();
                // Calculate EndDatum as BeginDatum + 6 days (weekly periods)
                foreach (var p in periods)
                {
                    if (p.EndDatum == default) p.EndDatum = p.BeginDatum.AddDays(6);
                }
                return periods;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get periods from Firebird, returning fallback data");
                // Return fallback periods when database is not available
                var today = DateTime.Today;
                var periods = new List<Period>();
                for (int i = 0; i < Math.Min(count, 10); i++)
                {
                    var startDate = today.AddDays(-i * 7);
                    var endDate = startDate.AddDays(6);
                    periods.Add(new Period
                    {
                        GcId = 100000 + i,
                        GcCode = $"2026-W{(52 - i):00}",
                        BeginDatum = startDate,
                        EndDatum = endDate
                    });
                }
                return periods;
            }
        }

        public async Task<IEnumerable<TimeEntryDto>> GetTimeEntriesAsync(int medewGcId, DateTime from, DateTime to)
        {
            _logger.LogInformation("Getting time entries for medew {MedewGcId} from {From} to {To}", medewGcId, from, to);
            using var connection = _connectionFactory.CreateConnection();
            const string sql = @"
                SELECT r.DOCUMENT_GC_ID AS DocumentGcId,
                       r.TAAK_GC_ID AS TaakGcId,
                       r.WERK_GC_ID AS WerkGcId,
                       u.MEDEW_GC_ID AS MedewGcId,
                       r.DATUM AS Datum,
                       r.AANTAL AS Aantal,
                       CASE WHEN w.GC_ID IS NULL THEN 'Geen project (verlof/ziek/feestdag)' ELSE w.GC_CODE END AS ProjectCode,
                       CASE WHEN w.GC_ID IS NULL THEN NULL ELSE w.GC_OMSCHRIJVING END AS ProjectName,
                       t.GC_OMSCHRIJVING AS TaskName,
                       r.GC_OMSCHRIJVING AS Description
                FROM AT_URENBREG r
                INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
                LEFT JOIN AT_WERK w ON w.GC_ID = r.WERK_GC_ID
                LEFT JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
                WHERE u.MEDEW_GC_ID = @MedewGcId
                  AND r.DATUM >= @From AND r.DATUM < @To
                ORDER BY r.DATUM DESC, r.GC_ID DESC";
            var result = await connection.QueryAsync<TimeEntryDto>(sql, new { MedewGcId = medewGcId, From = from.Date, To = to.Date.AddDays(1) });
            _logger.LogInformation("Found {Count} time entries", result.Count());
            return result;
        }

        public async Task<IEnumerable<Activity>> GetActivitiesAsync(int medewGcId, int limit)
        {
            _logger.LogInformation("Getting activities for medew {MedewGcId}, limit {Limit}", medewGcId, limit);
            using var connection = _connectionFactory.CreateConnection();
            
            // Bredere query die meer notificaties toont
            const string sql = @"
                SELECT r.DOCUMENT_GC_ID AS Id,
                       u.MEDEW_GC_ID AS UserId,
                       'time_entry' AS Type,
                       COALESCE(
                           CASE 
                               WHEN t.GC_OMSCHRIJVING IS NOT NULL THEN t.GC_OMSCHRIJVING
                               WHEN w.GC_OMSCHRIJVING IS NOT NULL THEN w.GC_OMSCHRIJVING
                               ELSE 'Tijdregistratie'
                           END || ': ' || COALESCE(r.GC_OMSCHRIJVING, 'Geen omschrijving')
                       , 'Nieuwe tijdregistratie') AS Message,
                       FALSE AS IsRead,
                       r.DATUM AS CreatedAt,
                       'ingediend' AS Status
                FROM AT_URENBREG r
                INNER JOIN AT_URENSTAT u ON r.DOCUMENT_GC_ID = u.DOCUMENT_GC_ID
                LEFT JOIN AT_TAAK t ON t.GC_ID = r.TAAK_GC_ID
                LEFT JOIN AT_WERK w ON w.GC_ID = r.WERK_GC_ID
                WHERE u.MEDEW_GC_ID = @MedewGcId
                  AND (r.TAAK_GC_ID IS NOT NULL OR r.WERK_GC_ID IS NOT NULL)
                ORDER BY r.DATUM DESC
                ROWS @Limit";
            var result = await connection.QueryAsync<Activity>(sql, new { MedewGcId = medewGcId, Limit = limit });
            _logger.LogInformation("Found {Count} activities for user {UserId}", result.Count(), medewGcId);
            return result;
        }

        public async Task<int?> GetDocumentGcIdAsync(int medewGcId, int urenperGcId, int adminisGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            // Find existing URS document for medewerker and periode
            var sql = @"
                SELECT FIRST 1 d.GC_ID
                FROM AT_DOCUMENT d
                WHERE d.ADMINIS_GC_ID = @AdminisGcId
                  AND d.EIG_MEDEW_GC_ID = @MedewGcId
                  AND d.GC_CODE STARTING WITH 'URS'
                  AND EXISTS (
                      SELECT 1 FROM AT_URENSTAT u
                      WHERE u.DOCUMENT_GC_ID = d.GC_ID
                        AND u.URENPER_GC_ID = @UrenperGcId
                  )
                ORDER BY d.GC_ID DESC";
            return await connection.QueryFirstOrDefaultAsync<int?>(sql, new { MedewGcId = medewGcId, UrenperGcId = urenperGcId, AdminisGcId = adminisGcId });
        }

        public async Task<int> CreateDocumentAsync(int medewGcId, int adminisGcId, DateTime boekDatum, int urenperGcId, FbTransaction transaction = null)
        {
            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_DOCUMENT", transaction: transaction);
            var medewName = await connection.ExecuteScalarAsync<string>("SELECT GC_OMSCHRIJVING FROM AT_MEDEW WHERE GC_ID = @MedewGcId", new { MedewGcId = medewGcId }, transaction: transaction);
            var periodCode = await connection.ExecuteScalarAsync<string>("SELECT GC_CODE FROM AT_URENPER WHERE GC_ID = @UrenperGcId", new { UrenperGcId = urenperGcId }, transaction: transaction);
            
            // Generate unique code by finding highest sequence number for this base code
            var baseCode = $"URS{boekDatum:yy}{periodCode?.Replace("_", "") ?? "0000"}";
            var existingCount = await connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM AT_DOCUMENT WHERE GC_CODE STARTING WITH @BaseCode AND STENT_ST_ID = 175 AND ADMINIS_GC_ID = @AdminisGcId",
                new { BaseCode = baseCode, AdminisGcId = adminisGcId },
                transaction: transaction);
            
            var code = existingCount > 0 ? $"{baseCode}.{existingCount + 1}" : baseCode;
            var omschrijving = $"{medewName}, {periodCode}";
            var now = DateTime.Now;
            const string sql = @"
                INSERT INTO AT_DOCUMENT (
                    GC_ID, ADMINIS_GC_ID, STENT_ST_ID, EIG_MEDEW_GC_ID, AFDELING_GC_ID, DAGBOEK_GC_ID, LAYOUT_GC_ID, VALUTA_GC_ID, BOEKJAAR_GC_ID, GEBR_GC_ID, WZG_GEBR_GC_ID,
                    GC_DOC_STATUS, GC_HERKOMST, GC_DOORB_ONG_TOEG_JN, GC_INFORMATIE_GEV_JN, GC_NOTITIE_EXT_GEV_JN, GC_TONEN_OP_PORTAL_JN,
                    GC_CODE, GC_OMSCHRIJVING, GC_BOEKDATUM, GC_AANMAAKDATUM, GC_WIJZIGDATUM
                ) VALUES (
                    @GcId, @AdminisGcId, 175, @MedewGcId, 100004, 100025, 100281, 100001, 100028, 100001, 100001,
                    'G', 'A', 'J', 'N', 'N', 'N',
                    @Code, @Omschrijving, @BoekDatum, @AanmaakDatum, @WijzigDatum
                )";
            await connection.ExecuteAsync(sql, new
            {
                GcId = nextId,
                AdminisGcId = adminisGcId,
                MedewGcId = medewGcId,
                Code = code,
                Omschrijving = omschrijving,
                BoekDatum = boekDatum.Date,
                AanmaakDatum = now,
                WijzigDatum = now
            }, transaction: transaction);
            if (transaction == null) connection.Close();
            return nextId;
        }

        public async Task EnsureUrenstatAsync(int documentGcId, int medewGcId, int urenperGcId, FbTransaction transaction = null)
        {
            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            // Check if exists
            var sqlCheck = "SELECT COUNT(*) FROM AT_URENSTAT WHERE DOCUMENT_GC_ID = @DocumentGcId AND MEDEW_GC_ID = @MedewGcId AND URENPER_GC_ID = @UrenperGcId";
            var count = await connection.ExecuteScalarAsync<int>(sqlCheck, new { DocumentGcId = documentGcId, MedewGcId = medewGcId, UrenperGcId = urenperGcId }, transaction: transaction);
            if (count == 0)
            {
                var sqlInsert = "INSERT INTO AT_URENSTAT (DOCUMENT_GC_ID, MEDEW_GC_ID, URENPER_GC_ID, GEEXPORTEERD_JN, TVT_JN, DATUM) VALUES (@DocumentGcId, @MedewGcId, @UrenperGcId, 'N', 'N', NULL)";
                await connection.ExecuteAsync(sqlInsert, new { DocumentGcId = documentGcId, MedewGcId = medewGcId, UrenperGcId = urenperGcId }, transaction: transaction);
            }
            if (transaction == null) connection.Close();
        }

        public async Task<int> GetNextRegelNrAsync(int documentGcId, FbTransaction transaction = null)
        {
            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            const string sql = "SELECT COALESCE(MAX(GC_REGEL_NR), 0) + 1 FROM AT_URENBREG WHERE DOCUMENT_GC_ID = @DocumentGcId";
            var result = await connection.ExecuteScalarAsync<int>(sql, new { DocumentGcId = documentGcId }, transaction: transaction);
            if (transaction == null) connection.Close();
            return result;
        }

        public async Task InsertTimeEntryAsync(TimeEntry entry, FbTransaction transaction = null)
        {
            // Sync time entries with multiple lines for different cost types
            // TAAK determines if Montage (100256) or Tekenkamer (100032)
            // KOSTSRT varies per cost type:
            // - Normal hours: 100268 (Montage) or 100278 (Tekenkamer)
            // - Travel hours: 100269 (Montage) or 100279 (Tekenkamer)
            // - Distance km: 100300 (Reiskilometers)
            // - Travel costs: 100167 (Reis en verblijfskosten - 5569)
            // - Other expenses: 100288 (Materiaal)

            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            
            // Determine if this is Montage or Tekenkamer based on TAAK_GC_ID
            bool isMontage = entry.TaakGcId == 100256; // TAAK code "30" = Montage
            bool isTekenkamer = entry.TaakGcId == 100032; // TAAK code "40" = Tekenkamer
            
            // Set KOSTSRT for normal hours and travel hours based on task type
            int normalHoursKostsrt = isMontage ? 100268 : (isTekenkamer ? 100278 : entry.KostsrtGcId ?? 100268);
            int travelHoursKostsrt = isMontage ? 100269 : 100279; // 7011.02 MON or 7011.41 TK
            
            const string sql = @"
                INSERT INTO AT_URENBREG (
                    GC_ID, DOCUMENT_GC_ID, GC_REGEL_NR, DATUM, AANTAL, TAAK_GC_ID, WERK_GC_ID, MEDEW_GC_ID, GC_OMSCHRIJVING, KOSTSRT_GC_ID, BESTPAR_GC_ID
                ) VALUES (
                    @GcId, @DocumentGcId, @GcRegelNr, @Datum, @Aantal, @TaakGcId, @WerkGcId, @MedewGcId, @GcOmschrijving, @KostsrtGcId, @BestparGcId
                )";

            var regelNr = entry.GcRegelNr;

            // 1. Insert normal hours + evening/night hours (combined) under correct KOSTSRT
            var totalRegularHours = entry.Aantal + entry.EveningNightHours;
            if (totalRegularHours > 0)
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
                await connection.ExecuteAsync(sql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    GcRegelNr = regelNr++,
                    entry.Datum,
                    Aantal = totalRegularHours,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.MedewGcId,
                    entry.GcOmschrijving,
                    KostsrtGcId = normalHoursKostsrt,
                    entry.BestparGcId
                }, transaction: transaction);
            }

            // 2. Insert travel hours if > 0 under correct KOSTSRT (Montage or Tekenkamer reisuren)
            if (entry.TravelHours > 0)
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
                await connection.ExecuteAsync(sql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    GcRegelNr = regelNr++,
                    entry.Datum,
                    Aantal = entry.TravelHours,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.MedewGcId,
                    GcOmschrijving = "Reisuren",
                    KostsrtGcId = travelHoursKostsrt,
                    entry.BestparGcId
                }, transaction: transaction);
            }

            // 3. Insert distance km if > 0 under KOSTSRT 100167 (5569 - Reis en verblijfskosten)
            if (entry.DistanceKm > 0)
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
                await connection.ExecuteAsync(sql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    GcRegelNr = regelNr++,
                    entry.Datum,
                    Aantal = entry.DistanceKm,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.MedewGcId,
                    GcOmschrijving = $"{entry.DistanceKm} km",
                    KostsrtGcId = 100167, // 5569 Reis en verblijfskosten (D)
                    entry.BestparGcId
                }, transaction: transaction);
            }

            // 4. Insert travel costs if > 0 under KOSTSRT 100167 (5569 - Reis en verblijfskosten)
            if (entry.TravelCosts > 0)
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
                await connection.ExecuteAsync(sql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    GcRegelNr = regelNr++,
                    entry.Datum,
                    Aantal = entry.TravelCosts,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.MedewGcId,
                    GcOmschrijving = $"Reiskosten €{entry.TravelCosts:F2}",
                    KostsrtGcId = 100167, // 5569 Reis en verblijfskosten (D)
                    entry.BestparGcId
                }, transaction: transaction);
            }

            // 5. Insert other expenses if > 0 under KOSTSRT 100288 (Materiaal)
            if (entry.OtherExpenses > 0)
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
                await connection.ExecuteAsync(sql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    GcRegelNr = regelNr++,
                    entry.Datum,
                    Aantal = entry.OtherExpenses,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.MedewGcId,
                    GcOmschrijving = $"Onkosten €{entry.OtherExpenses:F2}",
                    KostsrtGcId = 100288, // M - Materiaal
                    entry.BestparGcId
                }, transaction: transaction);
            }

            if (transaction == null) connection.Close();
        }

        public async Task InsertVacationEntryAsync(VacationEntry entry, FbTransaction transaction = null)
        {
            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
            const string sql = @"
                INSERT INTO AT_URENBREG (
                    GC_ID, DOCUMENT_GC_ID, GC_REGEL_NR, DATUM, AANTAL, TAAK_GC_ID, WERK_GC_ID, MEDEW_GC_ID, GC_OMSCHRIJVING, KOSTSRT_GC_ID, BESTPAR_GC_ID
                ) VALUES (
                    @GcId, @DocumentGcId, @GcRegelNr, @Datum, @Aantal, @TaakGcId, NULL, @MedewGcId, @GcOmschrijving, @KostsrtGcId, @BestparGcId
                )";
            await connection.ExecuteAsync(sql, new
            {
                GcId = nextId,
                entry.DocumentGcId,
                entry.GcRegelNr,
                entry.Datum,
                entry.Aantal,
                entry.TaakGcId,
                entry.MedewGcId,
                entry.GcOmschrijving,
                entry.KostsrtGcId,
                entry.BestparGcId
            }, transaction: transaction);
            if (transaction == null) connection.Close();
        }

        public async Task<bool> IsDuplicateEntryAsync(int documentGcId, int taakGcId, int? werkGcId, DateTime datum, decimal aantal, string omschrijving)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT COUNT(*) FROM AT_URENBREG WHERE DOCUMENT_GC_ID = @DocumentGcId AND TAAK_GC_ID = @TaakGcId AND WERK_GC_ID = @WerkGcId AND DATUM = @Datum AND AANTAL = @Aantal AND COALESCE(GC_OMSCHRIJVING, '') = COALESCE(@Omschrijving, '')";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { DocumentGcId = documentGcId, TaakGcId = taakGcId, WerkGcId = werkGcId, Datum = datum, Aantal = aantal, Omschrijving = omschrijving });
            return count > 0;
        }

        public async Task<string> GetTaakCodeAsync(int taakGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_CODE FROM AT_TAAK WHERE GC_ID = @TaakGcId";
            return await connection.ExecuteScalarAsync<string>(sql, new { TaakGcId = taakGcId });
        }

        public async Task<bool> IsValidTaakAsync(int taakGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT COUNT(*) FROM AT_TAAK WHERE GC_ID = @TaakGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { TaakGcId = taakGcId });
            return count > 0;
        }

        public async Task<bool> IsValidWerkAsync(int werkGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT COUNT(*) FROM AT_WERK WHERE GC_ID = @WerkGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { WerkGcId = werkGcId });
            return count > 0;
        }

        public async Task<bool> IsValidUrenperAsync(int urenperGcId, int adminisGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            // Note: GC_ADMINIS_ID doesn't exist in AT_URENPER, so we just check if the period exists
            const string sql = "SELECT COUNT(*) FROM AT_URENPER WHERE GC_ID = @UrenperGcId";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { UrenperGcId = urenperGcId });
            return count > 0;
        }

        public async Task<string> GetWerkCodeAsync(int werkGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_CODE FROM AT_WERK WHERE GC_ID = @WerkGcId";
            return await connection.ExecuteScalarAsync<string>(sql, new { WerkGcId = werkGcId });
        }

        public async Task<(string Code, string Description)> GetWerkDetailsAsync(int werkGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_CODE, GC_OMSCHRIJVING FROM AT_WERK WHERE GC_ID = @WerkGcId";
            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { WerkGcId = werkGcId });
            return (result?.GC_CODE ?? "", result?.GC_OMSCHRIJVING ?? "");
        }

        public async Task<IEnumerable<User>> GetUsersAsync()
        {
            // Temporary hardcoded users for testing
            return new List<User>
            {
                new User
                {
                    Id = 100050,
                    LoginName = "Test User",
                    FirstName = "Test",
                    LastName = "User",
                    Email = "test@example.com",
                    Address = "",
                    HouseNumber = "",
                    PostalCode = "",
                    City = "",
                    Password = "",
                    Rank = "",
                    IsActive = true
                }
            };
        }

        public async Task<User> GetUserByIdAsync(int id)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT * FROM AT_MEDEW WHERE GC_ID = @Id";
            var user = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = id });
            if (user == null) return null;
            return new User
            {
                Id = (int)user.GC_ID,
                LoginName = (string)user.GC_OMSCHRIJVING,
                FirstName = ((string)user.GC_OMSCHRIJVING).Split(' ').FirstOrDefault() ?? "",
                LastName = string.Join(" ", ((string)user.GC_OMSCHRIJVING).Split(' ').Skip(1)),
                Email = "",
                Address = "",
                HouseNumber = "",
                PostalCode = "",
                City = "",
                Password = "",
                Rank = "",
                IsActive = true
            };
        }

        public async Task<IEnumerable<ClockwiseProject.Backend.Models.Project>> GetAllProjectsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, WERKGRP_GC_ID AS WerkgrpGcId, GC_OMSCHRIJVING AS Description FROM AT_WERK ORDER BY GC_CODE";
            return await connection.QueryAsync<ClockwiseProject.Backend.Models.Project>(sql);
        }

        public async Task<DateTime?> GetPeriodBeginDateAsync(int urenperGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT BEGINDATUM FROM AT_URENPER WHERE GC_ID = @UrenperGcId";
            return await connection.ExecuteScalarAsync<DateTime?>(sql, new { UrenperGcId = urenperGcId });
        }

        public async Task<IEnumerable<ProjectDto>> GetProjectsByIdsAsync(IEnumerable<int> werkGcIds)
        {
            if (!werkGcIds.Any()) return Enumerable.Empty<ProjectDto>();
            using var connection = _connectionFactory.CreateConnection();
            var ids = string.Join(",", werkGcIds);
            var sql = $"SELECT GC_ID AS Id, GC_CODE AS Code, GC_OMSCHRIJVING AS Description, WERKGRP_GC_ID AS GroupId FROM AT_WERK WHERE GC_ID IN ({ids}) ORDER BY GC_CODE";
            return await connection.QueryAsync<ProjectDto>(sql);
        }

        public async Task<IEnumerable<ProjectGroupDto>> GetProjectGroupsByIdsAsync(IEnumerable<int> werkgrpGcIds)
        {
            if (!werkgrpGcIds.Any()) return Enumerable.Empty<ProjectGroupDto>();
            using var connection = _connectionFactory.CreateConnection();
            var ids = string.Join(",", werkgrpGcIds);
            var sql = $"SELECT GC_ID AS Id, GC_CODE AS Code, GC_OMSCHRIJVING AS Description FROM AT_WERKGRP WHERE GC_ID IN ({ids}) ORDER BY GC_CODE";
            return await connection.QueryAsync<ProjectGroupDto>(sql);
        }

        public FbConnection GetConnection() => _connectionFactory.CreateConnection();
    }
}
