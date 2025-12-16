using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend;

namespace ClockwiseProject.Backend.Repositories
{
    public class FirebirdTimesheetRepository : ITimesheetRepository
    {
        private readonly FirebirdConnectionFactory _connectionFactory;

        public FirebirdTimesheetRepository(FirebirdConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<Timesheet>> GetAllAsync()
        {
            // Implement Firebird query to get all timesheets
            return new List<Timesheet>();
        }

        public async Task<Timesheet> GetByIdAsync(int id)
        {
            // Placeholder
            return null;
        }

        public async Task AddAsync(Timesheet timesheet)
        {
            // Implement Firebird insert
        }

        public async Task UpdateAsync(Timesheet timesheet)
        {
            // Implement Firebird update
        }

        public async Task DeleteAsync(int id)
        {
            // Implement Firebird delete
        }
    }
}
