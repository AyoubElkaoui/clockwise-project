using Microsoft.AspNetCore.Mvc;
using Dapper;
using ClockwiseProject.Backend;
using ClockwiseProject.Backend.Data;
using backend.Repositories;

namespace backend.Controllers;

/// <summary>
/// Diagnostics controller to help debug user ID mapping issues.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DiagnosticsController : ControllerBase
{
    private readonly FirebirdConnectionFactory _firebirdFactory;
    private readonly PostgreSQLConnectionFactory _postgresFactory;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(
        FirebirdConnectionFactory firebirdFactory,
        PostgreSQLConnectionFactory postgresFactory,
        ILogger<DiagnosticsController> logger)
    {
        _firebirdFactory = firebirdFactory;
        _postgresFactory = postgresFactory;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/diagnostics/user-mapping
    /// Shows the mapping between AT_GEBR (user accounts) and AT_MEDEW (employees).
    /// </summary>
    [HttpGet("user-mapping")]
    public async Task<IActionResult> GetUserMapping()
    {
        try
        {
            using var fbConn = _firebirdFactory.CreateConnection();
            
            // Get all AT_GEBR records
            var gebrSql = @"
                SELECT 
                    GC_ID,
                    GC_CODE,
                    GC_OMSCHRIJVING,
                    GEBR_GC_ID,
                    SOORT
                FROM AT_GEBR
                WHERE GC_HISTORISCH_JN = 'N'
                ORDER BY GC_CODE";
            
            var gebrRecords = await fbConn.QueryAsync<dynamic>(gebrSql);
            
            // Get all AT_MEDEW records
            var medewSql = @"
                SELECT 
                    GC_ID,
                    GC_CODE,
                    GC_OMSCHRIJVING as GC_NAAM,
                    ACTIEF_JN
                FROM AT_MEDEW
                WHERE ACTIEF_JN = 'J'
                ORDER BY GC_CODE";
            
            var medewRecords = await fbConn.QueryAsync<dynamic>(medewSql);
            
            // Get PostgreSQL users
            using var pgConn = _postgresFactory.CreateConnection();
            var pgUsersSql = @"
                SELECT 
                    id,
                    medew_gc_id,
                    username,
                    first_name,
                    last_name,
                    role
                FROM users
                WHERE is_active = true
                ORDER BY username";
            
            var pgUsers = await pgConn.QueryAsync<dynamic>(pgUsersSql);
            
            return Ok(new
            {
                at_gebr_count = gebrRecords.Count(),
                at_medew_count = medewRecords.Count(),
                postgres_users_count = pgUsers.Count(),
                at_gebr_accounts = gebrRecords,
                at_medew_employees = medewRecords,
                postgres_users = pgUsers,
                warning = "AT_GEBR.GC_ID (user account) may NOT equal AT_MEDEW.GC_ID (employee). Use GC_CODE or name matching to link them."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user mapping diagnostics");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/diagnostics/resolve-user/{gebrGcId}
    /// Attempts to resolve an AT_GEBR.GC_ID to the corresponding AT_MEDEW.GC_ID.
    /// </summary>
    [HttpGet("resolve-user/{gebrGcId}")]
    public async Task<IActionResult> ResolveUser(int gebrGcId)
    {
        try
        {
            using var conn = _firebirdFactory.CreateConnection();
            
            // Get AT_GEBR record
            var gebrSql = @"
                SELECT 
                    GC_ID,
                    GC_CODE,
                    GC_OMSCHRIJVING,
                    GEBR_GC_ID
                FROM AT_GEBR
                WHERE GC_ID = @gebrGcId";
            
            var gebr = await conn.QueryFirstOrDefaultAsync<dynamic>(gebrSql, new { gebrGcId });
            
            if (gebr == null)
            {
                return NotFound(new { error = $"No AT_GEBR record found with GC_ID = {gebrGcId}" });
            }
            
            // Try to find matching AT_MEDEW by code or name
            var medewSql = @"
                SELECT 
                    GC_ID,
                    GC_CODE,
                    GC_OMSCHRIJVING as GC_NAAM
                FROM AT_MEDEW
                WHERE GC_CODE = @code OR GC_OMSCHRIJVING CONTAINING @name
                ROWS 5";
            
            var medewMatches = await conn.QueryAsync<dynamic>(medewSql, new 
            { 
                code = gebr.GC_CODE,
                name = gebr.GC_OMSCHRIJVING
            });
            
            return Ok(new
            {
                at_gebr = new
                {
                    gc_id = gebr.GC_ID,
                    gc_code = gebr.GC_CODE,
                    description = gebr.GC_OMSCHRIJVING,
                    parent_gebr_id = gebr.GEBR_GC_ID
                },
                possible_at_medew_matches = medewMatches,
                recommendation = medewMatches.Any() 
                    ? $"Use AT_MEDEW.GC_ID = {medewMatches.First().GC_ID} for this user"
                    : "No clear AT_MEDEW match found. This user account may not have an employee record."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving user {GebrGcId}", gebrGcId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/diagnostics/check-time-entries/{medewGcId}
    /// Shows recent time entries for a given MEDEW_GC_ID.
    /// </summary>
    [HttpGet("check-time-entries/{medewGcId}")]
    public async Task<IActionResult> CheckTimeEntries(int medewGcId)
    {
        try
        {
            using var conn = _firebirdFactory.CreateConnection();
            
            // Check if medew exists
            var medewSql = "SELECT GC_OMSCHRIJVING FROM AT_MEDEW WHERE GC_ID = @medewGcId";
            var medewName = await conn.QueryFirstOrDefaultAsync<string>(medewSql, new { medewGcId });
            
            if (medewName == null)
            {
                return NotFound(new { error = $"No AT_MEDEW record found with GC_ID = {medewGcId}" });
            }
            
            // Get recent time entries
            var entriesSql = @"
                SELECT FIRST 10
                    u.GC_ID,
                    u.DOCUMENT_GC_ID,
                    s.MEDEW_GC_ID,
                    u.DATUM,
                    u.AANTAL,
                    u.GC_OMSCHRIJVING,
                    t.GC_CODE as TAAK_CODE
                FROM AT_URENBREG u
                INNER JOIN AT_URENSTAT s ON u.DOCUMENT_GC_ID = s.DOCUMENT_GC_ID
                LEFT JOIN AT_TAAK t ON u.TAAK_GC_ID = t.GC_ID
                WHERE s.MEDEW_GC_ID = @medewGcId
                ORDER BY u.DATUM DESC, u.GC_ID DESC";
            
            var entries = await conn.QueryAsync<dynamic>(entriesSql, new { medewGcId });
            
            return Ok(new
            {
                medew_gc_id = medewGcId,
                medew_name = medewName,
                time_entries_count = entries.Count(),
                recent_entries = entries
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking time entries for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
