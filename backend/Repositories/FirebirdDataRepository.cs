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

        public FirebirdDataRepository(FirebirdConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
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
            const string sql = "SELECT COUNT(*) FROM AT_MEDEW WHERE GC_ID = @MedewGcId AND GC_HISTORISCH_JN = 'N'";
            var count = await connection.ExecuteScalarAsync<int>(sql, new { MedewGcId = medewGcId });
            return count > 0;
        }

        public async Task<IEnumerable<ClockwiseProject.Backend.Models.ProjectGroup>> GetProjectGroupsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode FROM AT_WERKGRP ORDER BY GC_CODE";
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
            var sql = $"SELECT FIRST {count} GC_ID AS GcId, GC_CODE AS GcCode, BEGINDATUM AS BeginDatum, BOEKDATUM AS BoekDatum FROM AT_URENPER ORDER BY BEGINDATUM DESC";
            return await connection.QueryAsync<Period>(sql);
        }

        public async Task<IEnumerable<TimeEntry>> GetTimeEntriesAsync(int medewGcId, DateTime from, DateTime to)
        {
            // Dummy time entries for testing
            var dummyEntries = new List<TimeEntry>
            {
                new TimeEntry
                {
                    GcId = 1,
                    DocumentGcId = 1,
                    TaakGcId = 30,
                    WerkGcId = 1,
                    MedewGcId = medewGcId,
                    KostsrtGcId = 1,
                    BestparGcId = 1,
                    GcRegelNr = 1,
                    GcOmschrijving = "Development work",
                    Aantal = 8.0m,
                    Datum = DateTime.Today.AddDays(-1)
                },
                new TimeEntry
                {
                    GcId = 2,
                    DocumentGcId = 1,
                    TaakGcId = 40,
                    WerkGcId = 2,
                    MedewGcId = medewGcId,
                    KostsrtGcId = 1,
                    BestparGcId = 1,
                    GcRegelNr = 2,
                    GcOmschrijving = "Testing",
                    Aantal = 4.0m,
                    Datum = DateTime.Today.AddDays(-1)
                },
                new TimeEntry
                {
                    GcId = 3,
                    DocumentGcId = 2,
                    TaakGcId = 30,
                    WerkGcId = 1,
                    MedewGcId = medewGcId,
                    KostsrtGcId = 1,
                    BestparGcId = 1,
                    GcRegelNr = 1,
                    GcOmschrijving = "Bug fixing",
                    Aantal = 6.0m,
                    Datum = DateTime.Today
                }
            };

            // Filter by date range
            return dummyEntries.Where(e => e.Datum >= from && e.Datum <= to);
        }

        public async Task<int?> GetDocumentGcIdAsync(int medewGcId, int urenperGcId, int adminisGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            // First try AT_URENSTAT
            var sql1 = "SELECT FIRST 1 DOCUMENT_GC_ID FROM AT_URENSTAT WHERE MEDEW_GC_ID = @MedewGcId AND URENPER_GC_ID = @UrenperGcId";
            var docId = await connection.QueryFirstOrDefaultAsync<int?>(sql1, new { MedewGcId = medewGcId, UrenperGcId = urenperGcId });
            if (docId.HasValue) return docId;

            // Fallback to AT_DOCUMENT
            var sql2 = "SELECT FIRST 1 d.GC_ID FROM AT_DOCUMENT d JOIN AT_URENPER p ON p.GC_ID = @UrenperGcId WHERE d.EIG_MEDEW_GC_ID = @MedewGcId AND d.GC_BOEKDATUM = p.BOEKDATUM AND d.ADMINIS_GC_ID = @AdminisGcId ORDER BY d.GC_ID DESC";
            return await connection.QueryFirstOrDefaultAsync<int?>(sql2, new { MedewGcId = medewGcId, UrenperGcId = urenperGcId, AdminisGcId = adminisGcId });
        }

        public async Task<int> CreateDocumentAsync(int medewGcId, int adminisGcId, DateTime boekDatum)
        {
            using var connection = _connectionFactory.CreateConnection();
            var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_DOCUMENT");
            const string sql = "INSERT INTO AT_DOCUMENT (GC_ID, ADMINIS_GC_ID, EIG_MEDEW_GC_ID, GC_CODE, GC_BOEKDATUM) VALUES (@GcId, @AdminisGcId, @MedewGcId, @Code, @BoekDatum)";
            var code = $"DOC-{medewGcId}-{boekDatum:yyyyMMdd}-{nextId}";
            await connection.ExecuteAsync(sql, new { GcId = nextId, AdminisGcId = adminisGcId, MedewGcId = medewGcId, Code = code, BoekDatum = boekDatum.Date });
            return nextId;
        }

        public async Task EnsureUrenstatAsync(int documentGcId, int medewGcId, int urenperGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            // Check if exists
            var sqlCheck = "SELECT COUNT(*) FROM AT_URENSTAT WHERE DOCUMENT_GC_ID = @DocumentGcId AND MEDEW_GC_ID = @MedewGcId AND URENPER_GC_ID = @UrenperGcId";
            var count = await connection.ExecuteScalarAsync<int>(sqlCheck, new { DocumentGcId = documentGcId, MedewGcId = medewGcId, UrenperGcId = urenperGcId });
            if (count == 0)
            {
                try
                {
                    var sqlInsert = "INSERT INTO AT_URENSTAT (DOCUMENT_GC_ID, MEDEW_GC_ID, URENPER_GC_ID, DATUM, GEEXPORTEERD_JN, TVT_JN) VALUES (@DocumentGcId, @MedewGcId, @UrenperGcId, NULL, 'N', 'N')";
                    await connection.ExecuteAsync(sqlInsert, new { DocumentGcId = documentGcId, MedewGcId = medewGcId, UrenperGcId = urenperGcId });
                }
                catch
                {
                    // Legacy schema fallback with only mandatory columns
                    var legacyInsert = "INSERT INTO AT_URENSTAT (DOCUMENT_GC_ID, MEDEW_GC_ID, URENPER_GC_ID) VALUES (@DocumentGcId, @MedewGcId, @UrenperGcId)";
                    await connection.ExecuteAsync(legacyInsert, new { DocumentGcId = documentGcId, MedewGcId = medewGcId, UrenperGcId = urenperGcId });
                }
            }
        }

        public async Task<int> GetNextRegelNrAsync(int documentGcId)
        {
            using var connection = _connectionFactory.CreateConnection();
            try
            {
                const string sql = "SELECT COALESCE(MAX(GC_REGEL_NR), 0) + 1 FROM AT_URENBREG WHERE DOCUMENT_GC_ID = @DocumentGcId";
                return await connection.ExecuteScalarAsync<int>(sql, new { DocumentGcId = documentGcId });
            }
            catch
            {
                const string legacySql = "SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG WHERE DOCUMENT_GC_ID = @DocumentGcId";
                return await connection.ExecuteScalarAsync<int>(legacySql, new { DocumentGcId = documentGcId });
            }
        }

        public async Task InsertTimeEntryAsync(TimeEntry entry)
        {
            using var connection = _connectionFactory.CreateConnection();
            try
            {
                const string sql = "INSERT INTO AT_URENBREG (DOCUMENT_GC_ID, TAAK_GC_ID, WERK_GC_ID, KOSTSRT_GC_ID, BESTPAR_GC_ID, GC_REGEL_NR, GC_OMSCHRIJVING, AANTAL, DATUM) VALUES (@DocumentGcId, @TaakGcId, @WerkGcId, @KostsrtGcId, @BestparGcId, @GcRegelNr, @GcOmschrijving, @Aantal, @Datum)";
                await connection.ExecuteAsync(sql, entry);
            }
            catch
            {
                // Legacy schema without generator/extra columns
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG");
                const string legacySql = "INSERT INTO AT_URENBREG (GC_ID, DOCUMENT_GC_ID, TAAK_GC_ID, WERK_GC_ID, GC_OMSCHRIJVING, AANTAL, DATUM) VALUES (@GcId, @DocumentGcId, @TaakGcId, @WerkGcId, @GcOmschrijving, @Aantal, @Datum)";
                await connection.ExecuteAsync(legacySql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    entry.TaakGcId,
                    entry.WerkGcId,
                    entry.GcOmschrijving,
                    entry.Aantal,
                    entry.Datum
                });
            }
        }

        public async Task InsertVacationEntryAsync(VacationEntry entry)
        {
            using var connection = _connectionFactory.CreateConnection();
            try
            {
                const string sql = "INSERT INTO AT_URENBREG (DOCUMENT_GC_ID, TAAK_GC_ID, WERK_GC_ID, KOSTSRT_GC_ID, BESTPAR_GC_ID, GC_REGEL_NR, GC_OMSCHRIJVING, AANTAL, DATUM) VALUES (@DocumentGcId, @TaakGcId, NULL, @KostsrtGcId, @BestparGcId, @GcRegelNr, @GcOmschrijving, @Aantal, @Datum)";
                await connection.ExecuteAsync(sql, entry);
            }
            catch
            {
                var nextId = await connection.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(GC_ID), 0) + 1 FROM AT_URENBREG");
                const string legacySql = "INSERT INTO AT_URENBREG (GC_ID, DOCUMENT_GC_ID, TAAK_GC_ID, WERK_GC_ID, GC_OMSCHRIJVING, AANTAL, DATUM) VALUES (@GcId, @DocumentGcId, @TaakGcId, NULL, @GcOmschrijving, @Aantal, @Datum)";
                await connection.ExecuteAsync(legacySql, new
                {
                    GcId = nextId,
                    entry.DocumentGcId,
                    entry.TaakGcId,
                    entry.GcOmschrijving,
                    entry.Aantal,
                    entry.Datum
                });
            }
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
            const string sql = "SELECT GC_ID AS Id, GC_NAAM AS LoginName FROM AT_MEDEW WHERE GC_ID = @Id AND GC_HISTORISCH_JN = 'N'";
            var user = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = id });
            if (user == null) return null;
            return new User
            {
                Id = user.Id,
                LoginName = user.LoginName,
                FirstName = user.LoginName.Split(' ').FirstOrDefault() ?? "",
                LastName = string.Join(" ", user.LoginName.Split(' ').Skip(1)),
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

        public FbConnection GetConnection() => _connectionFactory.CreateConnection();
    }
}
