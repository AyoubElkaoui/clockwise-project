namespace backend.Services;

/// <summary>
/// Background service that schedules email reminders
/// - Tuesday 10:00: Employee reminder to register hours
/// - Tuesday 12:00: Manager overview email
/// </summary>
public class ReminderSchedulerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ReminderSchedulerService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    // Track last run times to prevent duplicates
    private DateTime? _lastEmployeeReminderRun;
    private DateTime? _lastManagerOverviewRun;

    public ReminderSchedulerService(
        IServiceProvider serviceProvider,
        ILogger<ReminderSchedulerService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
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

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("ReminderSchedulerService stopped");
    }

    private async Task CheckAndRunScheduledTasksAsync(CancellationToken stoppingToken)
    {
        var now = DateTime.Now;
        var today = now.Date;

        // Only run on Tuesday (DayOfWeek.Tuesday = 2)
        if (now.DayOfWeek != DayOfWeek.Tuesday)
        {
            return;
        }

        // Employee reminder at 10:00
        if (now.Hour == 10 && now.Minute < 5)
        {
            if (_lastEmployeeReminderRun?.Date != today)
            {
                _logger.LogInformation("Running scheduled employee reminder task");
                await RunEmployeeReminderAsync(stoppingToken);
                _lastEmployeeReminderRun = today;
            }
        }

        // Manager overview at 12:00
        if (now.Hour == 12 && now.Minute < 5)
        {
            if (_lastManagerOverviewRun?.Date != today)
            {
                _logger.LogInformation("Running scheduled manager overview task");
                await RunManagerOverviewAsync(stoppingToken);
                _lastManagerOverviewRun = today;
            }
        }
    }

    private async Task RunEmployeeReminderAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailReminderService>();

        try
        {
            await emailService.SendEmployeeReminderAsync();
            _logger.LogInformation("Employee reminder emails sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send employee reminder emails");
        }
    }

    private async Task RunManagerOverviewAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailReminderService>();

        try
        {
            await emailService.SendManagerOverviewAsync();
            _logger.LogInformation("Manager overview emails sent successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send manager overview emails");
        }
    }
}
