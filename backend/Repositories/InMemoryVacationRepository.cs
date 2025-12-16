using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;

namespace ClockwiseProject.Backend.Repositories
{
    public class InMemoryVacationRepository : IVacationRepository
    {
        private readonly List<VacationRequest> _vacationRequests = new();
        private int _nextId = 1;

        public async Task<IEnumerable<VacationRequest>> GetAllAsync()
        {
            return await Task.FromResult(_vacationRequests.AsEnumerable());
        }

        public async Task<VacationRequest> GetByIdAsync(int id)
        {
            return await Task.FromResult(_vacationRequests.FirstOrDefault(r => r.Id == id));
        }

        public async Task AddAsync(VacationRequest vacationRequest)
        {
            vacationRequest.Id = _nextId++;
            _vacationRequests.Add(vacationRequest);
            await Task.CompletedTask;
        }

        public async Task UpdateAsync(VacationRequest vacationRequest)
        {
            var existing = _vacationRequests.FirstOrDefault(r => r.Id == vacationRequest.Id);
            if (existing != null)
            {
                _vacationRequests.Remove(existing);
                _vacationRequests.Add(vacationRequest);
            }
            await Task.CompletedTask;
        }

        public async Task DeleteAsync(int id)
        {
            var request = _vacationRequests.FirstOrDefault(r => r.Id == id);
            if (request != null)
            {
                _vacationRequests.Remove(request);
            }
            await Task.CompletedTask;
        }
    }
}
