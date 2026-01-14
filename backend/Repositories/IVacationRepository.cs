using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Repositories
{
    public interface IVacationRepository
    {
        Task<IEnumerable<VacationRequest>> GetAllAsync();
        Task<IEnumerable<VacationRequest>> GetByUserIdAsync(int userId);
        Task<IEnumerable<VacationRequest>> GetByMedewGcIdAsync(int medewGcId);
        Task<VacationRequest?> GetByIdAsync(int id);
        Task AddAsync(VacationRequest vacationRequest);
        Task UpdateAsync(VacationRequest vacationRequest);
        Task DeleteAsync(int id);
    }
}
