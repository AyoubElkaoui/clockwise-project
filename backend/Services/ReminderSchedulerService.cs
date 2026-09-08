using Dapper;
using Npgsql;

namespace backend.Services;

/// <summary>
/// Plant de herinneringsmails: dinsdag 10:00 medewerkers, dinsdag 12:00 managers.
/// Of een run al is uitgevoerd staat in Postgres (tabel reminder_runs), zodat een herstart
/// of een tweede instantie nooit dezelfde mailing nog een keer verstuurt.
/// </summary>
public class ReminderSchedulerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReminderSchedulerService> _logger;
    private readonly string? _postgresConnection;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private bool _tableEnsured;

    public ReminderSchedulerService(
        IServiceProvider serviceProvider,
        ILogger<ReminderSchedulerService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _postgresConnection = configuration.GetConnectionString("PostgreSQL");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReminderSchedulerService started");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndRunScheduledTasksAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReminderSchedulerService");
            }
            try { await Task.Delay(_checkInterval, stoppingToken); } catch (TaskCanceledException) { }
        }
        _logger.LogInformation("ReminderSchedulerService stopped");
    }

    private async Task CheckAndRunScheduledTasksAsync(CancellationToken stoppingToken)
    {
        var now = DateTime.Now;
        if (now.DayOfWeek != DayOfWeek.Tuesday) return;

        if (now.Hour == 10 && now.Minute < 5 && await TryClaimRunAsync($"employee-{now:yyyy-MM-dd}"))
        {
            _logger.LogInformation("Running scheduled employee reminder task");
            await RunAsync(svc => svc.SendEmployeeReminderAsync(), "employee reminder");
        }

        if (now.Hour == 12 && now.Minute < 5 && await TryClaimRunAsync($"manager-{now:yyyy-MM-dd}"))
        {
            _logger.LogInformation("Running scheduled manager overview task");
            await RunAsync(svc => svc.SendManagerOverviewAsync(), "manager overview");
        }
    }

    /// <summary>Claimt een run-key atomisch; alleen de eerste claim krijgt true.</summary>
    private async Task<bool> TryClaimRunAsync(string runKey)
    {
        if (string.IsNullOrWhiteSpace(_postgresConnection))
        {
            _logger.LogWarning("Reminder run {Key} overgeslagen: geen PostgreSQL-connectie", runKey);
            return false;
        }
        await using var conn = new NpgsqlConnection(_postgresConnection);
        await conn.OpenAsync();
        if (!_tableEnsured)
        {
            await conn.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS reminder_runs (
                id SERIAL PRIMARY KEY,
                run_key TEXT NOT NULL UNIQUE,
                ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
            _tableEnsured = true;
        }
        var inserted = await conn.ExecuteAsync(
            "INSERT INTO reminder_runs (run_key) VALUES (@Key) ON CONFLICT (run_key) DO NOTHING",
            new { Key = runKey });
        return inserted == 1;
    }

    private async Task RunAsync(Func<IEmailReminderService, Task> action, string what)
    {
        using var scope = _serviceProvider.CreateScope();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailReminderService>();
        try
        {
            await action(emailService);
            _logger.LogInformation("{What} emails sent", what);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send {What} emails", what);
        }
    }
}
