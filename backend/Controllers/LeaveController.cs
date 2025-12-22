using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller voor leave/vacation operaties.
/// VIEW op AT_URENBREG + AT_TAAK, GEEN aparte tabellen.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LeaveController : ControllerBase
{
    private readonly LeaveService _leaveService;
    private readonly ILogger<LeaveController> _logger;

    public LeaveController(
        LeaveService leaveService,
        ILogger<LeaveController> logger)
    {
        _leaveService = leaveService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/leave/types
    /// Haalt alle leave/vacation types op (AT_TAAK met GC_CODE STARTING WITH 'Z').
    /// </summary>
    [HttpGet("types")]
    public async Task<ActionResult<LeaveTypesResponse>> GetLeaveTypes(
        [FromQuery] bool includeHistorical = false)
    {
        try
        {
            _logger.LogInformation("GET /api/leave/types called (includeHistorical={IncludeHistorical})",
                includeHistorical);

            var leaveTypes = await _leaveService.GetLeaveTypesAsync(includeHistorical);

            return Ok(new LeaveTypesResponse
            {
                LeaveTypes = leaveTypes,
                TotalCount = leaveTypes.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching leave types");
            return StatusCode(500, new { error = "Failed to fetch leave types", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/leave/my
    /// Haalt leave bookings op voor de ingelogde medewerker.
    /// Gebruikt X-MEDEW-GC-ID header voor authenticatie.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<MyLeaveResponse>> GetMyLeave(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header is required" });
            }

            _logger.LogInformation(
                "GET /api/leave/my called for employee {MedewGcId}, from {From} to {To}",
                medewGcId, from, to);

            var response = await _leaveService.GetLeaveBookingsAsync(
                medewGcId.Value,
                from,
                to);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching my leave bookings");
            return StatusCode(500, new { error = "Failed to fetch leave bookings", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/leave/book
    /// Boekt verlof/vakantie door INSERT in AT_URENBREG.
    /// </summary>
    [HttpPost("book")]
    public async Task<ActionResult<BookLeaveResponse>> BookLeave(
        [FromBody] BookLeaveRequest request)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header is required" });
            }

            _logger.LogInformation(
                "POST /api/leave/book called for employee {MedewGcId}, task {TaskId}, {EntryCount} entries",
                medewGcId, request.TaskId, request.Entries.Count);

            var response = await _leaveService.BookLeaveAsync(request, medewGcId.Value);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error booking leave");
            return StatusCode(500, new { error = "Failed to book leave", details = ex.Message });
        }
    }

    /// <summary>
    /// Helper om MedewGcId uit header of HttpContext te halen.
    /// Consistent met bestaande controllers.
    /// </summary>
    private int? ResolveMedewGcId()
    {
        // Try HttpContext.Items first (set by middleware)
        if (HttpContext.Items.TryGetValue("MedewGcId", out var medewObj))
        {
            return (int)medewObj;
        }

        // Fallback: try header directly
        if (Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var header) &&
            int.TryParse(header.ToString(), out var medewId))
        {
            return medewId;
        }

        return null;
    }
}
