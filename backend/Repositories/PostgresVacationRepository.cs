using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend;

namespace ClockwiseProject.Backend.Repositories
{
    public class PostgresVacationRepository : IVacationRepository
    {
        private readonly PostgresDbContext _context;

        public PostgresVacationRepository(PostgresDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<VacationRequest>> GetAllAsync()
        {
            return await _context.VacationRequests.ToListAsync();
        }

        public async Task<VacationRequest> GetByIdAsync(int id)
        {
            return await _context.VacationRequests.FindAsync(id);
        }

        public async Task AddAsync(VacationRequest vacationRequest)
        {
            await _context.VacationRequests.AddAsync(vacationRequest);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(VacationRequest vacationRequest)
        {
            _context.VacationRequests.Update(vacationRequest);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var vacationRequest = await _context.VacationRequests.FindAsync(id);
            if (vacationRequest != null)
            {
                _context.VacationRequests.Remove(vacationRequest);
                await _context.SaveChangesAsync();
            }
        }
    }
}
