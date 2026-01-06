using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Domain;
using FirebirdSql.Data.FirebirdClient;

namespace ClockwiseProject.Backend.Repositories
{
    public interface IFirebirdDataRepository
    {
        Task<IEnumerable<ClockwiseProject.Domain.Company>> GetCompaniesAsync();
        Task<IEnumerable<ClockwiseProject.Backend.Models.ProjectGroup>> GetProjectGroupsAsync();
        Task<IEnumerable<ClockwiseProject.Backend.Models.ProjectGroup>> GetProjectGroupsByCompanyAsync(int companyId);
        Task<IEnumerable<ClockwiseProject.Backend.Models.Project>> GetProjectsByGroupAsync(int groupId);
        Task<IEnumerable<ClockwiseProject.Backend.Models.Project>> GetAllProjectsAsync();
        Task<IEnumerable<TaskModel>> GetWorkTasksAsync();
        Task<IEnumerable<TaskModel>> GetVacationTasksAsync();
        Task<IEnumerable<Period>> GetPeriodsAsync(int count = 50);
        Task<DateTime?> GetPeriodBeginDateAsync(int urenperGcId);
        Task<IEnumerable<TimeEntryDto>> GetTimeEntriesAsync(int medewGcId, DateTime from, DateTime to);
        Task<IEnumerable<Activity>> GetActivitiesAsync(int medewGcId, int limit);
        Task<IEnumerable<ProjectDto>> GetProjectsByIdsAsync(IEnumerable<int> werkGcIds);
        Task<IEnumerable<ProjectGroupDto>> GetProjectGroupsByIdsAsync(IEnumerable<int> werkgrpGcIds);
        Task<int?> GetDocumentGcIdAsync(int medewGcId, int urenperGcId, int adminisGcId);
        Task<int> CreateDocumentAsync(int medewGcId, int adminisGcId, DateTime boekDatum, int urenperGcId, FbTransaction transaction = null);
        Task EnsureUrenstatAsync(int documentGcId, int medewGcId, int urenperGcId, FbTransaction transaction = null);
        Task<int> GetNextRegelNrAsync(int documentGcId, FbTransaction transaction = null);
        Task InsertTimeEntryAsync(TimeEntry entry, FbTransaction transaction = null);
        Task InsertVacationEntryAsync(VacationEntry entry, FbTransaction transaction = null);
        Task<bool> IsMedewActiveAsync(int medewGcId);
        Task<bool> IsDuplicateEntryAsync(int documentGcId, int taakGcId, int? werkGcId, DateTime datum, decimal aantal, string omschrijving);
        Task<string> GetTaakCodeAsync(int taakGcId);
        Task<bool> IsValidTaakAsync(int taakGcId);
        Task<bool> IsValidWerkAsync(int werkGcId);
        Task<bool> IsValidUrenperAsync(int urenperGcId, int adminisGcId);
        Task<string> GetWerkCodeAsync(int werkGcId);
    Task<(string Code, string Description)> GetWerkDetailsAsync(int werkGcId);
        Task<IEnumerable<User>> GetUsersAsync();
        Task<User> GetUserByIdAsync(int id);
        FbConnection GetConnection();
    }
}
