using ClockwiseProject.Backend;
using backend.Models;
using Dapper;

namespace backend.Repositories;

public class FirebirdTaskRepository : ITaskRepository
{
    private readonly FirebirdConnectionFactory _connectionFactory;
    private readonly ILogger<FirebirdTaskRepository> _logger;

    public FirebirdTaskRepository(
        FirebirdConnectionFactory connectionFactory,
        ILogger<FirebirdTaskRepository> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<List<TaskDto>> GetAllAsync(bool includeHistorical = false)
    {
        const string sql = @"
            SELECT
                GC_ID AS Id,
                GC_CODE AS Code,
                GC_OMSCHRIJVING AS Description,
                GC_KORTE_NAAM AS ShortName,
                GC_HISTORISCH_JN AS IsHistoricalFlag
            FROM AT_TAAK
            WHERE
                (@includeHistorical = 1 OR GC_HISTORISCH_JN = 'N')
            ORDER BY
                GC_CODE
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var results = await connection.QueryAsync<TaskDtoRaw>(sql, new
            {
                includeHistorical = includeHistorical ? 1 : 0
            });

            return results.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching all tasks (includeHistorical={IncludeHistorical})", includeHistorical);
            throw;
        }
    }

    public async Task<TaskDto?> GetByIdAsync(int gcId)
    {
        const string sql = @"
            SELECT
                GC_ID AS Id,
                GC_CODE AS Code,
                GC_OMSCHRIJVING AS Description,
                GC_KORTE_NAAM AS ShortName,
                GC_HISTORISCH_JN AS IsHistoricalFlag
            FROM AT_TAAK
            WHERE GC_ID = @gcId
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<TaskDtoRaw>(sql, new { gcId });

            return result != null ? MapToDto(result) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching task by ID={GcId}", gcId);
            throw;
        }
    }

    public async Task<List<TaskDto>> GetLeaveTasksAsync(bool includeHistorical = false)
    {
        const string sql = @"
            SELECT
                GC_ID AS Id,
                GC_CODE AS Code,
                GC_OMSCHRIJVING AS Description,
                GC_KORTE_NAAM AS ShortName,
                GC_HISTORISCH_JN AS IsHistoricalFlag
            FROM AT_TAAK
            WHERE
                GC_CODE STARTING WITH 'Z'
                AND (@includeHistorical = 1 OR GC_HISTORISCH_JN = 'N')
            ORDER BY
                GC_CODE
        ";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var results = await connection.QueryAsync<TaskDtoRaw>(sql, new
            {
                includeHistorical = includeHistorical ? 1 : 0
            });

            return results.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching leave tasks (includeHistorical={IncludeHistorical})", includeHistorical);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(int gcId)
    {
        const string sql = "SELECT COUNT(*) FROM AT_TAAK WHERE GC_ID = @gcId";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var count = await connection.ExecuteScalarAsync<int>(sql, new { gcId });
            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if task exists (gcId={GcId})", gcId);
            throw;
        }
    }

    private static TaskDto MapToDto(TaskDtoRaw raw)
    {
        return new TaskDto
        {
            Id = raw.Id,
            Code = raw.Code?.Trim() ?? string.Empty,
            Description = raw.Description?.Trim() ?? string.Empty,
            ShortName = raw.ShortName?.Trim(),
            IsHistorical = raw.IsHistoricalFlag?.Trim().ToUpper() == "J"
        };
    }

    // Helper class voor Dapper mapping (Firebird retourneert strings)
    private class TaskDtoRaw
    {
        public int Id { get; set; }
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string? ShortName { get; set; }
        public string? IsHistoricalFlag { get; set; }
    }
}
