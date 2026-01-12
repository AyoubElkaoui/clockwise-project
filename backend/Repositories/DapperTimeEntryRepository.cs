using Dapper;
using ClockwiseProject.Backend;
using ClockwiseProject.Backend.Data;

namespace backend.Repositories;

public class DapperTimeEntryRepository
{
    private readonly FirebirdConnectionFactory _firebirdConnectionFactory;
    private readonly PostgreSQLConnectionFactory _postgresConnectionFactory;
    private readonly ILogger<DapperTimeEntryRepository> _logger;

    public DapperTimeEntryRepository(
        FirebirdConnectionFactory firebirdConnectionFactory,
        PostgreSQLConnectionFactory postgresConnectionFactory,
        ILogger<DapperTimeEntryRepository> logger)
    {
        _firebirdConnectionFactory = firebirdConnectionFactory;
        _postgresConnectionFactory = postgresConnectionFactory;
        _logger = logger;
    }

    public async Task<IEnumerable<TimeEntryDto>> GetAllTimeEntriesAsync(DateTime? from = null, DateTime? to = null)
    {
        var fromDate = from ?? DateTime.Now.AddMonths(-3);
        var toDate = to ?? DateTime.Now;

        const string sql = @"
            SELECT
                u.GC_ID as Id,
                u.MEDEW_GC_ID as UserId,
                u.DATUM as EntryDate,
                u.AANTAL as Hours,
                u.WERK_GC_ID as ProjectId,
                u.GC_OMSCHRIJVING as Notes,
                m.GC_OMSCHRIJVING as UserFullName,
                w.GC_CODE as ProjectCode,
                w.GC_OMSCHRIJVING as ProjectName
            FROM AT_URENBREG u
            LEFT JOIN AT_MEDEW m ON u.MEDEW_GC_ID = m.GC_ID
            LEFT JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
            WHERE u.DATUM BETWEEN @fromDate AND @toDate
            ORDER BY u.DATUM DESC";

        try
        {
            using var connection = _firebirdConnectionFactory.CreateConnection();
            var entries = await connection.QueryAsync<TimeEntryDto>(sql, new { fromDate, toDate });
            return entries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entries from {From} to {To}", fromDate, toDate);
            throw;
        }
    }

    public async Task<IEnumerable<TimeEntryDto>> GetPendingApprovalsAsync()
    {
        // Firebird AT_URENBREG doesn't have STATUS column - all entries considered pending
        const string sql = @"
            SELECT
                u.GC_ID as Id,
                u.MEDEW_GC_ID as UserId,
                u.DATUM as EntryDate,
                u.AANTAL as Hours,
                u.WERK_GC_ID as ProjectId,
                u.GC_OMSCHRIJVING as Notes,
                m.GC_OMSCHRIJVING as UserFullName,
                w.GC_CODE as ProjectCode,
                w.GC_OMSCHRIJVING as ProjectName
            FROM AT_URENBREG u
            LEFT JOIN AT_MEDEW m ON u.MEDEW_GC_ID = m.GC_ID
            LEFT JOIN AT_WERK w ON u.WERK_GC_ID = w.GC_ID
            ORDER BY u.DATUM DESC";

        try
        {
            using var connection = _firebirdConnectionFactory.CreateConnection();
            var entries = await connection.QueryAsync<TimeEntryDto>(sql);
            return entries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending approvals");
            throw;
        }
    }

    public async Task<bool> ApproveTimeEntryAsync(int id, bool approved)
    {
        // Firebird AT_URENBREG doesn't have STATUS column
        // This is a placeholder that just verifies the entry exists
        const string sql = @"
            SELECT GC_ID
            FROM AT_URENBREG
            WHERE GC_ID = @id";

        try
        {
            using var connection = _firebirdConnectionFactory.CreateConnection();
            var entry = await connection.QuerySingleOrDefaultAsync<int?>(sql, new { id });

            _logger.LogInformation("Time entry {Id} {Action} (Firebird doesn't support status updates)", id, approved ? "approved" : "rejected");
            return entry != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking time entry {Id}", id);
            throw;
        }
    }

    public async Task<TimeEntryStatsDto> GetStatsAsync()
    {
        // Firebird AT_URENBREG doesn't have STATUS column
        const string sql = @"
            SELECT
                COUNT(DISTINCT u.MEDEW_GC_ID) as TotalUsers,
                COUNT(*) as TotalEntries,
                0 as PendingApprovals,
                COUNT(*) as ApprovedEntries,
                SUM(CASE WHEN u.DATUM >= CURRENT_DATE - 7 THEN u.AANTAL ELSE 0 END) as HoursThisWeek,
                SUM(CASE WHEN u.DATUM >= CURRENT_DATE - 30 THEN u.AANTAL ELSE 0 END) as HoursThisMonth
            FROM AT_URENBREG u";

        try
        {
            using var connection = _firebirdConnectionFactory.CreateConnection();
            var stats = await connection.QuerySingleAsync<TimeEntryStatsDto>(sql);
            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entry stats");
            throw;
        }
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        const string sql = @"
            SELECT
                GC_ID as MedewGcId,
                GC_OMSCHRIJVING as FullName
            FROM AT_MEDEW
            WHERE GC_ID IS NOT NULL
            ORDER BY GC_OMSCHRIJVING";

        try
        {
            using var connection = _firebirdConnectionFactory.CreateConnection();
            var users = await connection.QueryAsync<UserDto>(sql);
            return users;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users");
            throw;
        }
    }

    public async Task<IEnumerable<UserDto>> GetTeamMembersForManagerAsync(int managerMedewGcId)
    {
        // FOR NOW: Return all users from PostgreSQL users table
        // TODO: Later filter by manager_assignments when that data is populated
        const string getAllUsersSql = @"
            SELECT
                u.id as Id,
                u.medew_gc_id as MedewGcId,
                COALESCE(u.first_name || ' ' || u.last_name, u.username) as FullName,
                u.first_name as FirstName,
                u.last_name as LastName,
                u.username,
                u.email,
                u.role
            FROM users u
            WHERE u.role = 'user' 
              AND u.is_active = true
            ORDER BY u.first_name, u.last_name";

        try
        {
            using var pgConnection = _postgresConnectionFactory.CreateConnection();
            var users = await pgConnection.QueryAsync<UserDto>(getAllUsersSql);

            _logger.LogInformation("Manager (medew_gc_id: {MedewGcId}) loaded {Count} team members from PostgreSQL", 
                managerMedewGcId, users.Count());

            return users;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching team members from PostgreSQL for manager {MedewGcId}", managerMedewGcId);
            throw;
        }
    }
}

public class TimeEntryDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime EntryDate { get; set; }
    public DateTime Date => EntryDate; // Alias for compatibility
    public decimal Hours { get; set; }
    public int ProjectId { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "opgeslagen";
    public string? UserFullName { get; set; }
    public string? UserFirstName => UserFullName?.Split(' ').FirstOrDefault();
    public string? UserLastName => string.Join(" ", UserFullName?.Split(' ').Skip(1) ?? new string[0]);
    public string? ProjectCode { get; set; }
    public string? ProjectName { get; set; }

    // Frontend compatibility fields - simulate startTime/endTime from date + hours
    public string? StartTime => EntryDate.ToString("yyyy-MM-ddT08:00:00");
    public string? EndTime
    {
        get
        {
            var start = EntryDate.AddHours(8); // Assume work starts at 8:00
            var end = start.AddHours((double)Hours);
            return end.ToString("yyyy-MM-ddTHH:mm:ss");
        }
    }
    public int BreakMinutes { get; set; } = 0;
    public decimal DistanceKm { get; set; } = 0;
    public decimal Expenses { get; set; } = 0;
}

public class TimeEntryStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalEntries { get; set; }
    public int PendingApprovals { get; set; }
    public int ApprovedEntries { get; set; }
    public decimal HoursThisWeek { get; set; }
    public decimal HoursThisMonth { get; set; }
}

public class UserDto
{
    public int MedewGcId { get; set; }
    public int Id => MedewGcId; // Alias for frontend compatibility
    public string FullName { get; set; } = string.Empty;
    public string Naam => FullName?.Split(' ').FirstOrDefault() ?? "";
    public string Voornaam => string.Join(" ", FullName?.Split(' ').Skip(1) ?? new string[0]);

    // Frontend compatibility - split FullName into FirstName and LastName
    public string FirstName => FullName?.Split(' ').FirstOrDefault() ?? "";
    public string LastName => string.Join(" ", FullName?.Split(' ').Skip(1) ?? new string[0]);
}
