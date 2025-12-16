using ClockwiseProject.Backend.Models;

namespace ClockwiseProject.Backend.Services
{
    /// <summary>
    /// Simple in-memory activity store so the frontend has data to render.
    /// Replace with a persistent implementation when available.
    /// </summary>
    public class ActivityService
    {
        private readonly List<Activity> _activities = new();
        private readonly object _lock = new();
        private int _nextId = 1;

        public ActivityService()
        {
            Seed();
        }

        public Task<IEnumerable<Activity>> GetActivitiesAsync(int? userId, int limit)
        {
            lock (_lock)
            {
                var query = _activities.AsEnumerable();
                if (userId.HasValue)
                {
                    query = query.Where(a => a.UserId == userId.Value);
                }

                var result = query
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(limit > 0 ? limit : 20)
                    .ToList();

                return Task.FromResult<IEnumerable<Activity>>(result);
            }
        }

        public Task MarkAsReadAsync(int activityId)
        {
            lock (_lock)
            {
                var activity = _activities.FirstOrDefault(a => a.Id == activityId);
                if (activity != null)
                {
                    activity.IsRead = true;
                }
            }

            return Task.CompletedTask;
        }

        public Task MarkAllAsReadAsync(int userId)
        {
            lock (_lock)
            {
                foreach (var activity in _activities.Where(a => a.UserId == userId))
                {
                    activity.IsRead = true;
                }
            }

            return Task.CompletedTask;
        }

        private void Seed()
        {
            // A handful of placeholder items for local development
            _activities.AddRange(new[]
            {
                CreateActivity(100050, "timesheet", "Je urenstaat is aangemaakt voor deze maand."),
                CreateActivity(100050, "approval", "Je manager heeft je uren van vorige week goedgekeurd."),
                CreateActivity(100050, "reminder", "Vergeet niet je uren van gisteren bij te werken."),
                CreateActivity(200010, "system", "Welkom! Dit is je eerste activiteit."),
                CreateActivity(100050, "vacation", "Je vakantieaanvraag is ontvangen."),
            });
        }

        private Activity CreateActivity(int userId, string type, string message)
        {
            return new Activity
            {
                Id = _nextId++,
                UserId = userId,
                Type = type,
                Message = message,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-_nextId * 15)
            };
        }
    }
}
