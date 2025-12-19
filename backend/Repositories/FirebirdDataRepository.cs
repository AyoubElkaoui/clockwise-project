using Dapper;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Domain;
using FirebirdSql.Data.FirebirdClient;
using BackendProject = ClockwiseProject.Backend.Models.Project;
using BackendProjectGroup = ClockwiseProject.Backend.Models.ProjectGroup;
using System.Linq;

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
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, WERKGRP_GC_ID AS WerkgrpGcId FROM AT_WERK WHERE WERKGRP_GC_ID = @GroupId ORDER BY GC_CODE";
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
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode FROM AT_TAAK WHERE GC_CODE STARTING WITH 'Z' ORDER BY GC_CODE";
            return await connection.QueryAsync<TaskModel>(sql);
        }

        public async Task<IEnumerable<Period>> GetPeriodsAsync(int count = 50)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = $"SELECT FIRST {count} GC_ID AS GcId, GC_CODE AS GcCode, BEGINDATUM AS BeginDatum, EINDDATUM AS EndDate FROM AT_URENPER ORDER BY BEGINDATUM DESC";
            return await connection.QueryAsync<Period>(sql);
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
            var code = $"URS{boekDatum:yy}{periodCode?.Replace("_", "") ?? "0000"}";
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
            await connection.ExecuteAsync(sql, new { 
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
            var connection = transaction?.Connection ?? _connectionFactory.CreateConnection();
            if (transaction == null) await connection.OpenAsync();
            var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG", transaction: transaction);
            const string sql = @"
                INSERT INTO AT_URENBREG (
                    GC_ID, DOCUMENT_GC_ID, GC_REGEL_NR, DATUM, AANTAL, TAAK_GC_ID, WERK_GC_ID, MEDEW_GC_ID, GC_OMSCHRIJVING, KOSTSRT_GC_ID, BESTPAR_GC_ID
                ) VALUES (
                    @GcId, @DocumentGcId, @GcRegelNr, @Datum, @Aantal, @TaakGcId, @WerkGcId, @MedewGcId, @GcOmschrijving, @KostsrtGcId, @BestparGcId
                )";
            await connection.ExecuteAsync(sql, new
            {
                GcId = nextId,
                entry.DocumentGcId,
                entry.GcRegelNr,
                entry.Datum,
                entry.Aantal,
                entry.TaakGcId,
                entry.WerkGcId,
                entry.MedewGcId,
                entry.GcOmschrijving,
                entry.KostsrtGcId,
                entry.BestparGcId
            }, transaction: transaction);
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
