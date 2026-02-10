using backend.Repositories;
using ClockwiseProject.Backend.Repositories;
using MailKit.Net.Smtp;
using MimeKit;
using Npgsql;
using Dapper;

namespace backend.Services;

/// <summary>
/// Service for sending email reminders about time registration
/// </summary>
public interface IEmailReminderService
{
    Task SendEmployeeReminderAsync();
    Task SendManagerOverviewAsync();
}

public class EmailReminderService : IEmailReminderService
{
    private readonly ILogger<EmailReminderService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IFirebirdDataRepository _firebirdRepo;
    private readonly string _postgresConnection;

    public EmailReminderService(
        ILogger<EmailReminderService> logger,
        IConfiguration configuration,
        IFirebirdDataRepository firebirdRepo)
    {
        _logger = logger;
        _configuration = configuration;
        _firebirdRepo = firebirdRepo;
        _postgresConnection = configuration.GetConnectionString("PostgreSQL")
            ?? throw new InvalidOperationException("PostgreSQL connection string not found");
    }

    /// <summary>
    /// Send reminder email to all active employees to register their hours
    /// Called on Tuesday at 10:00
    /// </summary>
    public async Task SendEmployeeReminderAsync()
    {
        _logger.LogInformation("Starting employee hour registration reminder emails...");

        try
        {
            await using var conn = new NpgsqlConnection(_postgresConnection);
            await conn.OpenAsync();

            // Get all active users with email addresses
            var users = await conn.QueryAsync<(int Id, string Email, string FirstName, string LastName)>(
                @"SELECT id, email, first_name, last_name
                  FROM users
                  WHERE role != 'inactive' AND email IS NOT NULL AND email != ''");

            var sentCount = 0;
            foreach (var user in users)
            {
                try
                {
                    await SendEmailAsync(
                        user.Email,
                        $"{user.FirstName} {user.LastName}",
                        "Herinnering: Uren Registreren",
                        GetEmployeeReminderHtml(user.FirstName)
                    );
                    sentCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send reminder to {Email}", user.Email);
                }
            }

            _logger.LogInformation("Sent {Count} employee reminder emails", sentCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SendEmployeeReminderAsync");
            throw;
        }
    }

    /// <summary>
    /// Send overview email to managers with who has/hasn't registered hours
    /// Called on Tuesday at 12:00
    /// </summary>
    public async Task SendManagerOverviewAsync()
    {
        _logger.LogInformation("Starting manager overview emails...");

        try
        {
            await using var conn = new NpgsqlConnection(_postgresConnection);
            await conn.OpenAsync();

            // Get managers (specifically Rob and Engelbert, or all managers)
            var managers = await conn.QueryAsync<(int Id, string Email, string FirstName, string LastName)>(
                @"SELECT id, email, first_name, last_name
                  FROM users
                  WHERE role = 'manager' AND email IS NOT NULL AND email != ''");

            // Get current period ID
            var currentPeriodId = await GetCurrentPeriodIdAsync();

            // Get week date range
            var today = DateTime.Today;
            var weekStart = today.AddDays(-(int)today.DayOfWeek + (int)DayOfWeek.Monday);
            var weekEnd = weekStart.AddDays(6);

            // Get all users and their registration status
            var allUsers = await conn.QueryAsync<(int Id, int MedewGcId, string FirstName, string LastName, string Email)>(
                @"SELECT id, medew_gc_id, first_name, last_name, email
                  FROM users
                  WHERE role != 'inactive' AND role != 'manager'");

            // Get who has submitted entries this week
            var submittedUsers = await conn.QueryAsync<int>(
                @"SELECT DISTINCT medew_gc_id
                  FROM time_entries_workflow
                  WHERE datum >= @WeekStart AND datum <= @WeekEnd
                  AND status IN ('SUBMITTED', 'APPROVED')
                  AND urenper_gc_id = @PeriodId",
                new { WeekStart = weekStart, WeekEnd = weekEnd, PeriodId = currentPeriodId });

            var submittedSet = new HashSet<int>(submittedUsers);

            var usersWithHours = allUsers.Where(u => submittedSet.Contains(u.MedewGcId)).ToList();
            var usersWithoutHours = allUsers.Where(u => !submittedSet.Contains(u.MedewGcId)).ToList();

            // Send to each manager
            foreach (var manager in managers)
            {
                try
                {
                    await SendEmailAsync(
                        manager.Email,
                        $"{manager.FirstName} {manager.LastName}",
                        $"Uren Overzicht Week {GetISOWeekOfYear(today)}",
                        GetManagerOverviewHtml(
                            manager.FirstName,
                            weekStart,
                            weekEnd,
                            usersWithHours.Select(u => $"{u.FirstName} {u.LastName}").ToList(),
                            usersWithoutHours.Select(u => $"{u.FirstName} {u.LastName}").ToList()
                        )
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send overview to manager {Email}", manager.Email);
                }
            }

            _logger.LogInformation("Sent overview emails to {Count} managers", managers.Count());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SendManagerOverviewAsync");
            throw;
        }
    }

    private async Task<int> GetCurrentPeriodIdAsync()
    {
        // Try to get from Firebird
        try
        {
            using var connection = _firebirdRepo.GetConnection();
            var adminisGcId = _configuration.GetValue<int>("AdminisGcId", 1);
            var periodId = await connection.ExecuteScalarAsync<int?>(
                @"SELECT FIRST 1 GC_ID FROM AT_URENPER
                  WHERE ADMINIS_GC_ID = @AdminisGcId
                  AND GC_BEGINDAT <= CURRENT_DATE
                  AND GC_EINDDAT >= CURRENT_DATE",
                new { AdminisGcId = adminisGcId });
            return periodId ?? 100436; // Fallback
        }
        catch
        {
            return 100436; // Fallback
        }
    }

    private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            "Clockwise",
            _configuration["Email:FromEmail"] ?? "noreply@clockwise.com"
        ));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPass = _configuration["Email:SmtpPassword"];

        await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
        if (!string.IsNullOrEmpty(smtpUser) && !string.IsNullOrEmpty(smtpPass))
        {
            await client.AuthenticateAsync(smtpUser, smtpPass);
        }
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
    }

    private static string GetEmployeeReminderHtml(string firstName)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>⏰ Uren Registratie Herinnering</h1>
        </div>
        <div class='content'>
            <p>Beste {firstName},</p>
            <p>Dit is een vriendelijke herinnering om je uren te registreren voor deze week.</p>
            <p>Het is belangrijk dat alle uren tijdig worden ingevoerd zodat de administratie en facturatie soepel kunnen verlopen.</p>
            <p><a href='https://altumtechnical.clockwise.info' class='button'>Open Clockwise</a></p>
            <p>Dank je wel!</p>
        </div>
        <div class='footer'>
            <p>Dit is een automatische herinnering van Clockwise.</p>
        </div>
    </div>
</body>
</html>";
    }

    private static string GetManagerOverviewHtml(
        string firstName,
        DateTime weekStart,
        DateTime weekEnd,
        List<string> usersWithHours,
        List<string> usersWithoutHours)
    {
        var withHoursList = usersWithHours.Count > 0
            ? string.Join("", usersWithHours.Select(u => $"<li style='color: #10B981;'>✓ {u}</li>"))
            : "<li style='color: #6B7280;'>Niemand heeft nog uren ingediend</li>";

        var withoutHoursList = usersWithoutHours.Count > 0
            ? string.Join("", usersWithoutHours.Select(u => $"<li style='color: #EF4444;'>✗ {u}</li>"))
            : "<li style='color: #10B981;'>Iedereen heeft uren ingediend! 🎉</li>";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
        .stat {{ text-align: center; padding: 15px; background: white; border-radius: 8px; min-width: 100px; }}
        .stat-number {{ font-size: 32px; font-weight: bold; }}
        .stat-label {{ font-size: 12px; color: #666; }}
        .section {{ margin: 20px 0; padding: 15px; background: white; border-radius: 8px; }}
        .section h3 {{ margin-top: 0; }}
        ul {{ list-style: none; padding: 0; }}
        li {{ padding: 5px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📊 Wekelijks Uren Overzicht</h1>
            <p>Week {weekStart:dd MMM} - {weekEnd:dd MMM yyyy}</p>
        </div>
        <div class='content'>
            <p>Beste {firstName},</p>
            <p>Hieronder een overzicht van de uren registraties van deze week:</p>

            <div class='stats'>
                <div class='stat'>
                    <div class='stat-number' style='color: #10B981;'>{usersWithHours.Count}</div>
                    <div class='stat-label'>Ingediend</div>
                </div>
                <div class='stat'>
                    <div class='stat-number' style='color: #EF4444;'>{usersWithoutHours.Count}</div>
                    <div class='stat-label'>Nog niet ingediend</div>
                </div>
            </div>

            <div class='section'>
                <h3>✓ Uren Ingediend</h3>
                <ul>{withHoursList}</ul>
            </div>

            <div class='section'>
                <h3>✗ Nog Geen Uren</h3>
                <ul>{withoutHoursList}</ul>
            </div>

            <p><a href='https://altumtechnical.clockwise.info/manager/review-time' style='display: inline-block; background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;'>Bekijk in Clockwise</a></p>
        </div>
        <div class='footer'>
            <p>Dit is een automatisch overzicht van Clockwise.</p>
        </div>
    </div>
</body>
</html>";
    }

    private static int GetISOWeekOfYear(DateTime date)
    {
        var day = System.Globalization.CultureInfo.InvariantCulture.Calendar.GetDayOfWeek(date);
        if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday)
        {
            date = date.AddDays(3);
        }
        return System.Globalization.CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(
            date, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
    }
}
