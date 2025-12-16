using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Repositories
{
    public interface ITimesheetRepository
    {
        Task<IEnumerable<Timesheet>> GetAllAsync();
        Task<Timesheet> GetByIdAsync(int id);
        Task AddAsync(Timesheet timesheet);
        Task UpdateAsync(Timesheet timesheet);
        Task DeleteAsync(int id);
    }
}
