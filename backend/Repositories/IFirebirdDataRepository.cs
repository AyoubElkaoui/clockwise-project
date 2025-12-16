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
        Task<IEnumerable<TaskModel>> GetWorkTasksAsync();
        Task<IEnumerable<TaskModel>> GetVacationTasksAsync();
        Task<IEnumerable<Period>> GetPeriodsAsync(int count = 50);
        Task<IEnumerable<TimeEntry>> GetTimeEntriesAsync(int medewGcId, DateTime from, DateTime to);
        Task<int?> GetDocumentGcIdAsync(int medewGcId, int urenperGcId, int adminisGcId);
        Task<int> CreateDocumentAsync(int medewGcId, int adminisGcId, DateTime boekDatum);
        Task EnsureUrenstatAsync(int documentGcId, int medewGcId, int urenperGcId);
        Task<int> GetNextRegelNrAsync(int documentGcId);
        Task InsertTimeEntryAsync(TimeEntry entry);
        Task InsertVacationEntryAsync(VacationEntry entry);
        Task<bool> IsMedewActiveAsync(int medewGcId);
        Task<bool> IsDuplicateEntryAsync(int documentGcId, int taakGcId, int? werkGcId, DateTime datum, decimal aantal, string omschrijving);
        Task<string> GetTaakCodeAsync(int taakGcId);
        Task<IEnumerable<User>> GetUsersAsync();
        Task<User> GetUserByIdAsync(int id);
        FbConnection GetConnection();
    }
}
