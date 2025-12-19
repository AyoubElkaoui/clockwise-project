using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;

namespace ClockwiseProject.Backend.Services
{
    public class VacationService
    {
        private readonly IVacationRepository _vacationRepository;

        public VacationService(IVacationRepository vacationRepository)
        {
            _vacationRepository = vacationRepository;
        }

        public async Task<IEnumerable<VacationRequest>> GetAllVacationRequestsAsync()
        {
            return await _vacationRepository.GetAllAsync();
        }

        public async Task<IEnumerable<VacationRequest>> GetVacationRequestsByUserIdAsync(int userId)
        {
            return await _vacationRepository.GetByUserIdAsync(userId);
        }

        public async Task<VacationRequest> GetVacationRequestByIdAsync(int id)
        {
            return await _vacationRepository.GetByIdAsync(id);
        }

        public async Task AddVacationRequestAsync(VacationRequest vacationRequest)
        {
            await _vacationRepository.AddAsync(vacationRequest);
        }

        public async Task UpdateVacationRequestAsync(VacationRequest vacationRequest)
        {
            await _vacationRepository.UpdateAsync(vacationRequest);
        }

        public async Task DeleteVacationRequestAsync(int id)
        {
            await _vacationRepository.DeleteAsync(id);
        }

        // Business logic for approving/rejecting
        public async Task ApproveVacationRequestAsync(int id, string managerComment, int reviewedBy)
        {
            var request = await _vacationRepository.GetByIdAsync(id);
            if (request != null)
            {
                request.Status = "approved";
                request.ManagerComment = managerComment;
                request.ReviewedAt = DateTime.Now;
                request.ReviewedBy = reviewedBy;
                await _vacationRepository.UpdateAsync(request);
            }
        }

        public async Task RejectVacationRequestAsync(int id, string managerComment, int reviewedBy)
        {
            var request = await _vacationRepository.GetByIdAsync(id);
            if (request != null)
            {
                request.Status = "rejected";
                request.ManagerComment = managerComment;
                request.ReviewedAt = DateTime.Now;
                request.ReviewedBy = reviewedBy;
                await _vacationRepository.UpdateAsync(request);
            }
        }
    }
}
