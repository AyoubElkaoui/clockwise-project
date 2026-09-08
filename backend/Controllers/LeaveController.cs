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
    /// </summary>
    [HttpGet("types")]
    public async Task<ActionResult<LeaveTypesResponse>> GetLeaveTypes(
        [FromQuery] bool includeHistorical = false)
    {
        try
        {
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
            return StatusCode(500, new { error = "Fout bij ophalen verloftypes" });
        }
    }

    /// <summary>
    /// GET /api/leave/my?from=&to=
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<MyLeaveResponse>> GetMyLeave(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

        if (from == default || to == default)
            return BadRequest(new { error = "from en to zijn verplicht" });

        if (from > to)
            return BadRequest(new { error = "from mag niet na to liggen" });

        try
        {
            var response = await _leaveService.GetLeaveBookingsAsync(medewGcId.Value, from, to);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching leave bookings for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen verlofboekingen" });
        }
    }

    /// <summary>
    /// POST /api/leave/book
    /// </summary>
    [HttpPost("book")]
    public async Task<ActionResult<BookLeaveResponse>> BookLeave(
        [FromBody] BookLeaveRequest? request)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

        if (request == null || request.Entries == null || request.Entries.Count == 0)
            return BadRequest(new { error = "Geen verlofregels meegegeven" });

        if (request.TaskId <= 0)
            return BadRequest(new { error = "Ongeldig verloftype" });

        foreach (var entry in request.Entries)
        {
            if (entry == null)
                return BadRequest(new { error = "Ongeldige verlofregel" });
            if (entry.Hours <= 0 || entry.Hours > 24)
                return BadRequest(new { error = "Uren per dag moeten tussen 0 en 24 liggen" });
            if (entry.Date == default)
                return BadRequest(new { error = "Elke verlofregel moet een datum hebben" });
        }

        try
        {
            var response = await _leaveService.BookLeaveAsync(request, medewGcId.Value);

            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error booking leave for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij boeken verlof" });
        }
    }
}
