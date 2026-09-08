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

        /// <summary>
        /// Atomische statusovergang: zet de status alleen op <paramref name="toStatus"/> als de
        /// huidige status (hoofdletterongevoelig) een van <paramref name="fromStatuses"/> is.
        /// Geeft true terug als precies één rij is bijgewerkt.
        /// </summary>
        Task<bool> TryTransitionStatusAsync(int id, IEnumerable<string> fromStatuses, string toStatus);
    }
}
