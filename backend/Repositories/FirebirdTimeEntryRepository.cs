using ClockwiseProject.Backend;
using backend.Models;
using Dapper;

namespace backend.Repositories;

public class FirebirdTimeEntryRepository : ITimeEntryRepository
{
    private readonly FirebirdConnectionFactory _connectionFactory;
    private readonly ILogger<FirebirdTimeEntryRepository> _logger;

    public FirebirdTimeEntryRepository(
        FirebirdConnectionFactory connectionFactory,
        ILogger<FirebirdTimeEntryRepository> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<List<TimeEntryDetailDto>> GetByEmployeeAndDateRangeAsync(
        int medewGcId,
        DateTime fromDate,
        DateTime toDate)
    {
        const string sql = @"
            SELECT
                u.GC_ID AS BookingId,
                s.GC_MEDEW_ID AS MedewGcId,
                u.GC_TAAK_ID AS TaakGcId,
                u.GC_WERK_ID AS WerkGcId,
                u.GC_DATUM AS Datum,
                u.GC_UREN AS Uren,
                u.GC_OMSCHRIJVING AS Omschrijving,
                t.GC_CODE AS TaskCode,
                t.GC_OMSCHRIJVING AS TaskDescription
            FROM AT_URENBREG u
            INNER JOIN AT_URENSTAT s ON u.GC_URENSTAT_ID = s.GC_ID
            LEFT JOIN AT_TAAK t ON u.GC_TAAK_ID = t.GC_ID
            WHERE
                s.GC_MEDEW_ID = @medewGcId
                AND u.GC_DATUM BETWEEN @fromDate AND @toDate
            ORDER BY
                u.GC_DATUM DESC
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var results = await connection.QueryAsync<TimeEntryDetailDtoRaw>(sql, new
            {
                medewGcId,
                fromDate,
                toDate
            });

            return results.Select(MapToDetailDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entries for employee {MedewGcId} from {FromDate} to {ToDate}",
                medewGcId, fromDate, toDate);
            throw;
        }
    }

    public async Task<List<LeaveBookingDto>> GetLeaveBookingsByEmployeeAsync(
        int medewGcId,
        DateTime fromDate,
        DateTime toDate)
    {
        const string sql = @"
            SELECT
                u.GC_ID AS BookingId,
                u.GC_DATUM AS Date,
                u.GC_UREN AS Hours,
                u.GC_OMSCHRIJVING AS BookingDescription,
                u.GC_TAAK_ID AS TaskId,
                t.GC_CODE AS TaskCode,
                t.GC_OMSCHRIJVING AS TaskDescription
            FROM AT_URENBREG u
            INNER JOIN AT_URENSTAT s ON u.GC_URENSTAT_ID = s.GC_ID
            INNER JOIN AT_TAAK t ON u.GC_TAAK_ID = t.GC_ID
            WHERE
                s.GC_MEDEW_ID = @medewGcId
                AND u.GC_DATUM BETWEEN @fromDate AND @toDate
                AND t.GC_CODE STARTING WITH 'Z'
            ORDER BY
                u.GC_DATUM DESC
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var results = await connection.QueryAsync<LeaveBookingDtoRaw>(sql, new
            {
                medewGcId,
                fromDate,
                toDate
            });

            return results.Select(MapToLeaveBookingDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching leave bookings for employee {MedewGcId} from {FromDate} to {ToDate}",
                medewGcId, fromDate, toDate);
            throw;
        }
    }

    public async Task<List<TimeEntryDetailDto>> GetByEmployeeAndDateAsync(
        int medewGcId,
        DateTime date)
    {
        const string sql = @"
            SELECT
                u.GC_ID AS BookingId,
                s.GC_MEDEW_ID AS MedewGcId,
                u.GC_TAAK_ID AS TaakGcId,
                u.GC_WERK_ID AS WerkGcId,
                u.GC_DATUM AS Datum,
                u.GC_UREN AS Uren,
                u.GC_OMSCHRIJVING AS Omschrijving,
                t.GC_CODE AS TaskCode,
                t.GC_OMSCHRIJVING AS TaskDescription
            FROM AT_URENBREG u
            INNER JOIN AT_URENSTAT s ON u.GC_URENSTAT_ID = s.GC_ID
            LEFT JOIN AT_TAAK t ON u.GC_TAAK_ID = t.GC_ID
            WHERE
                s.GC_MEDEW_ID = @medewGcId
                AND u.GC_DATUM = @date
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var results = await connection.QueryAsync<TimeEntryDetailDtoRaw>(sql, new
            {
                medewGcId,
                date
            });

            return results.Select(MapToDetailDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time entries for employee {MedewGcId} on date {Date}",
                medewGcId, date);
            throw;
        }
    }

    public async Task<int> CreateAsync(CreateTimeEntryCommand command)
    {
        // Eerst: haal UrenStat ID op voor deze medewerker
        const string getUrenStatSql = @"
            SELECT GC_ID
            FROM AT_URENSTAT
            WHERE GC_MEDEW_ID = @medewGcId
            ORDER BY GC_ID DESC
            ROWS 1
        ";

        const string insertSql = @"
            INSERT INTO AT_URENBREG (
                GC_ID,
                GC_URENSTAT_ID,
                GC_TAAK_ID,
                GC_WERK_ID,
                GC_DATUM,
                GC_UREN,
                GC_OMSCHRIJVING
            ) VALUES (
                GEN_ID(GEN_AT_URENBREG_ID, 1),
                @urenStatId,
                @taakGcId,
                @werkGcId,
                @datum,
                @uren,
                @omschrijving
            )
            RETURNING GC_ID
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();

            // Stap 1: Haal UrenStat ID op
            var urenStatId = await connection.ExecuteScalarAsync<int?>(getUrenStatSql, new
            {
                medewGcId = command.MedewGcId
            });

            if (urenStatId == null)
            {
                throw new InvalidOperationException(
                    $"No AT_URENSTAT record found for employee {command.MedewGcId}");
            }

            // Stap 2: Insert time entry
            var newGcId = await connection.ExecuteScalarAsync<int>(insertSql, new
            {
                urenStatId,
                taakGcId = command.TaakGcId,
                werkGcId = command.WerkGcId,
                datum = command.Datum,
                uren = command.Uren,
                omschrijving = command.Omschrijving ?? string.Empty
            });

            _logger.LogInformation(
                "Created time entry GC_ID={GcId} for employee {MedewGcId}, task {TaakGcId}, date {Date}, hours {Hours}",
                newGcId, command.MedewGcId, command.TaakGcId, command.Datum, command.Uren);

            return newGcId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating time entry for employee {MedewGcId}, task {TaakGcId}",
                command.MedewGcId, command.TaakGcId);
            throw;
        }
    }

    public async Task<bool> IsEmployeeActiveAsync(int medewGcId)
    {
        const string sql = @"
            SELECT COUNT(*)
            FROM AT_MEDEW
            WHERE GC_ID = @medewGcId
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var count = await connection.ExecuteScalarAsync<int>(sql, new { medewGcId });
            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if employee {MedewGcId} is active", medewGcId);
            throw;
        }
    }

    // Mapping helpers
    private static TimeEntryDetailDto MapToDetailDto(TimeEntryDetailDtoRaw raw)
    {
        return new TimeEntryDetailDto
        {
            BookingId = raw.BookingId,
            MedewGcId = raw.MedewGcId,
            TaakGcId = raw.TaakGcId,
            WerkGcId = raw.WerkGcId,
            Datum = raw.Datum,
            Uren = raw.Uren,
            Omschrijving = raw.Omschrijving?.Trim(),
            TaskCode = raw.TaskCode?.Trim(),
            TaskDescription = raw.TaskDescription?.Trim()
        };
    }

    private static LeaveBookingDto MapToLeaveBookingDto(LeaveBookingDtoRaw raw)
    {
        return new LeaveBookingDto
        {
            BookingId = raw.BookingId,
            Date = raw.Date,
            Hours = raw.Hours,
            Description = raw.BookingDescription?.Trim(),
            TaskId = raw.TaskId,
            TaskCode = raw.TaskCode?.Trim() ?? string.Empty,
            TaskDescription = raw.TaskDescription?.Trim() ?? string.Empty,
            Category = string.Empty  // Wordt later gevuld door LeaveService
        };
    }

    // Raw DTOs voor Dapper
    private class TimeEntryDetailDtoRaw
    {
        public int BookingId { get; set; }
        public int MedewGcId { get; set; }
        public int TaakGcId { get; set; }
        public int? WerkGcId { get; set; }
        public DateTime Datum { get; set; }
        public decimal Uren { get; set; }
        public string? Omschrijving { get; set; }
        public string? TaskCode { get; set; }
        public string? TaskDescription { get; set; }
    }

    private class LeaveBookingDtoRaw
    {
        public int BookingId { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
        public string? BookingDescription { get; set; }
        public int TaskId { get; set; }
        public string? TaskCode { get; set; }
        public string? TaskDescription { get; set; }
    }
}
