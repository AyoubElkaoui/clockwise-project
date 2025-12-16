using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Repositories
{
    public interface IAtriumProjectRepository
    {
        Task<IEnumerable<ProjectGroup>> GetAllProjectGroupsAsync();
        Task<IEnumerable<Project>> GetProjectsByGroupAsync(int groupId);
    }
}
