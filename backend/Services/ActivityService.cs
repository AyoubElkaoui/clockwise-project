using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;

namespace ClockwiseProject.Backend.Services
{
    public class ActivityService
    {
        private readonly IFirebirdDataRepository _repository;

        public ActivityService(IFirebirdDataRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<Activity>> GetActivitiesAsync(int? userId, int limit)
        {
            if (!userId.HasValue)
            {
                return Enumerable.Empty<Activity>();
            }

            return await _repository.GetActivitiesAsync(userId.Value, limit);
        }

        public Task MarkAsReadAsync(int activityId)
        {
            // For now, do nothing as activities are read-only
            return Task.CompletedTask;
        }

        public Task MarkAllAsReadAsync(int userId)
        {
            // For now, do nothing
            return Task.CompletedTask;
        }
    }
}
