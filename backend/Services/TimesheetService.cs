using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;

namespace ClockwiseProject.Backend.Services
{
    public class TimesheetService
    {
        private readonly ITimesheetRepository _timesheetRepository;

        public TimesheetService(ITimesheetRepository timesheetRepository)
        {
            _timesheetRepository = timesheetRepository;
        }

        public async Task<IEnumerable<Timesheet>> GetAllTimesheetsAsync()
        {
            return await _timesheetRepository.GetAllAsync();
        }

        public async Task<Timesheet> GetTimesheetByIdAsync(int id)
        {
            return await _timesheetRepository.GetByIdAsync(id);
        }

        public async Task AddTimesheetAsync(Timesheet timesheet)
        {
            await _timesheetRepository.AddAsync(timesheet);
        }

        public async Task UpdateTimesheetAsync(Timesheet timesheet)
        {
            await _timesheetRepository.UpdateAsync(timesheet);
        }

        public async Task DeleteTimesheetAsync(int id)
        {
            await _timesheetRepository.DeleteAsync(id);
        }

        // Additional business logic methods, e.g., approve, reject
        public async Task ApproveTimesheetAsync(int id, string managerComment, int reviewedBy)
        {
            var timesheet = await _timesheetRepository.GetByIdAsync(id);
            if (timesheet != null)
            {
                timesheet.Status = "approved";
                timesheet.ManagerComment = managerComment;
                timesheet.ReviewedAt = DateTime.Now;
                timesheet.ReviewedBy = reviewedBy;
                await _timesheetRepository.UpdateAsync(timesheet);
            }
        }

        public async Task RejectTimesheetAsync(int id, string managerComment, int reviewedBy)
        {
            var timesheet = await _timesheetRepository.GetByIdAsync(id);
            if (timesheet != null)
            {
                timesheet.Status = "rejected";
                timesheet.ManagerComment = managerComment;
                timesheet.ReviewedAt = DateTime.Now;
                timesheet.ReviewedBy = reviewedBy;
                await _timesheetRepository.UpdateAsync(timesheet);
            }
        }
    }
}
