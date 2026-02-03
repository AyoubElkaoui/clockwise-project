using backend.Models;
using backend.Services;
using backend.Repositories;
using Microsoft.AspNetCore.Mvc;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Models;
using Npgsql;

namespace backend.Controllers;

/// <summary>
/// Controller for time entry workflow (draft/submit/approve)
/// </summary>
[ApiController]
[Route("api/workflow")]
public class WorkflowController : ControllerBase
{
    private readonly WorkflowService _workflowService;
    private readonly ILogger<WorkflowController> _logger;
    private readonly INotificationRepository _notificationRepo;
    private readonly string _connectionString;

    public WorkflowController(
        WorkflowService workflowService,
        ILogger<WorkflowController> logger,
        INotificationRepository notificationRepo,
        IConfiguration configuration)
    {
        _workflowService = workflowService;
        _logger = logger;
        _notificationRepo = notificationRepo;
        _connectionString = configuration.GetConnectionString("PostgreSQL") ?? throw new InvalidOperationException("PostgreSQL connection string not found");
    }

    /// <summary>
    /// POST /api/workflow/draft
    /// Save time entry as draft (user can still edit)
    /// </summary>
    [HttpPost("draft")]
    public async Task<ActionResult<DraftResponse>> SaveDraft([FromBody] SaveDraftRequest request)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "POST /api/workflow/draft for employee {MedewGcId}, date {Datum}",
                medewGcId, request.Datum);

            var response = await _workflowService.SaveDraftAsync(medewGcId.Value, request);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving draft");
            return StatusCode(500, new { error = "Failed to save draft", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflow/drafts
    /// Get all draft entries for current employee
    /// </summary>
    [HttpGet("drafts")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetDrafts([FromQuery] int urenperGcId)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "GET /api/workflow/drafts for employee {MedewGcId}, period {UrenperGcId}",
                medewGcId, urenperGcId);

            var response = await _workflowService.GetDraftsAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching drafts");
            return StatusCode(500, new { error = "Failed to fetch drafts", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflow/submitted
    /// Get submitted entries for current employee
    /// </summary>
    [HttpGet("submitted")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetSubmitted([FromQuery] int urenperGcId)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "GET /api/workflow/submitted for employee {MedewGcId}, period {UrenperGcId}",
                medewGcId, urenperGcId);

            var response = await _workflowService.GetSubmittedAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching submitted entries");
            return StatusCode(500, new { error = "Failed to fetch submitted entries", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflow/rejected
    /// Get rejected entries for current employee (need revision)
    /// </summary>
    [HttpGet("rejected")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetRejected([FromQuery] int urenperGcId)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "GET /api/workflow/rejected for employee {MedewGcId}, period {UrenperGcId}",
                medewGcId, urenperGcId);

            var response = await _workflowService.GetRejectedAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching rejected entries");
            return StatusCode(500, new { error = "Failed to fetch rejected entries", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/workflow/submit
    /// Submit draft entries for manager review
    /// </summary>
    [HttpPost("submit")]
    public async Task<ActionResult<WorkflowResponse>> SubmitEntries([FromBody] SubmitTimeEntriesRequest request)
    {
        try
        {
            _logger.LogInformation(
                "POST /api/workflow/submit received - UrenperGcId: {UrenperGcId}, EntryIds: {EntryIds}",
                request?.UrenperGcId ?? 0, 
                request?.EntryIds != null ? string.Join(",", request.EntryIds) : "null");

            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "POST /api/workflow/submit for employee {MedewGcId}, {Count} entries",
                medewGcId, request.EntryIds.Count);

            var response = await _workflowService.SubmitEntriesAsync(medewGcId.Value, request);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            // Notificatie sturen naar manager
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                
                var sql = @"
                    SELECT ma.manager_id, u.first_name, u.last_name
                    FROM manager_assignments ma
                    JOIN users u ON u.id = ma.employee_id
                    WHERE ma.employee_id = (SELECT id FROM users WHERE medew_gc_id = @MedewGcId)
                    LIMIT 1";
                
                using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("MedewGcId", medewGcId.Value);
                
                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var managerId = reader.GetInt32(0);
                    var firstName = reader.GetString(1);
                    var lastName = reader.GetString(2);
                    
                    await reader.CloseAsync();
                    
                    await _notificationRepo.CreateAsync(new CreateNotificationDto
                    {
                        UserId = managerId,
                        Type = "timesheet_submitted",
                        Title = "Nieuwe timesheet ingediend",
                        Message = $"{firstName} {lastName} heeft een timesheet ingediend voor goedkeuring",
                        RelatedEntityType = "timesheet",
                        RelatedEntityId = request.UrenperGcId
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send manager notification for timesheet submission");
                // Continue - don't fail the submission if notification fails
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting entries");
            return StatusCode(500, new { error = "Failed to submit entries", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/workflow/resubmit
    /// Resubmit rejected entries after revision
    /// </summary>
    [HttpPost("resubmit")]
    public async Task<ActionResult<WorkflowResponse>> ResubmitRejected([FromBody] SubmitTimeEntriesRequest request)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "POST /api/workflow/resubmit for employee {MedewGcId}, {Count} entries",
                medewGcId, request.EntryIds.Count);

            var response = await _workflowService.ResubmitRejectedEntriesAsync(medewGcId.Value, request);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resubmitting entries");
            return StatusCode(500, new { error = "Failed to resubmit entries", details = ex.Message });
        }
    }

    /// <summary>
    /// DELETE /api/workflow/draft/{id}
    /// Delete a draft entry
    /// </summary>
    [HttpDelete("draft/{id}")]
    public async Task<ActionResult<WorkflowResponse>> DeleteDraft(int id)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            _logger.LogInformation(
                "DELETE /api/workflow/draft/{Id} for employee {MedewGcId}",
                id, medewGcId);

            var response = await _workflowService.DeleteDraftAsync(medewGcId.Value, id);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting draft");
            return StatusCode(500, new { error = "Failed to delete draft", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflow/review/pending
    /// Get all submitted entries awaiting review (for managers)
    /// </summary>
    [HttpGet("review/pending")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetPendingReview([FromQuery] int urenperGcId)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            // Manager authorization check
            var userRole = HttpContext.Request.Headers["X-USER-ROLE"].FirstOrDefault();
            if (userRole?.ToLower() != "manager")
            {
                _logger.LogWarning("Non-manager user {MedewGcId} attempted to review time entries", medewGcId);
                return StatusCode(403, new { error = "Only managers can review time entries" });
            }

            _logger.LogInformation(
                "GET /api/workflow/review/pending for manager {MedewGcId}, period {UrenperGcId}",
                medewGcId, urenperGcId);

            var response = await _workflowService.GetAllSubmittedForReviewAsync(urenperGcId, medewGcId.Value);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending reviews");
            return StatusCode(500, new { error = "Failed to fetch pending reviews", details = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/workflow/entries
    /// Get all entries for a period with optional status filter (for manager overview)
    /// </summary>
    [HttpGet("entries")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetEntries(
        [FromQuery] int urenperGcId, 
        [FromQuery] string? status = null)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            // Manager authorization check
            var userRole = HttpContext.Request.Headers["X-USER-ROLE"].FirstOrDefault();
            if (userRole?.ToLower() != "manager")
            {
                _logger.LogWarning("Non-manager user {MedewGcId} attempted to access all entries", medewGcId);
                return StatusCode(403, new { error = "Only managers can view all entries" });
            }

            _logger.LogInformation(
                "GET /api/workflow/entries for manager {MedewGcId}, period {UrenperGcId}, status {Status}",
                medewGcId, urenperGcId, status ?? "ALL");

            var response = await _workflowService.GetAllEntriesByPeriodAsync(urenperGcId, status);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching entries");
            return StatusCode(500, new { error = "Failed to fetch entries", details = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/workflow/review
    /// Approve or reject time entries (manager only)
    /// </summary>
    [HttpPost("review")]
    public async Task<ActionResult<WorkflowResponse>> ReviewEntries([FromBody] ReviewTimeEntriesRequest request)
    {
        try
        {
            var medewGcId = ResolveMedewGcId();
            if (medewGcId == null)
            {
                return Unauthorized(new { error = "X-MEDEW-GC-ID header required" });
            }

            // Manager authorization check
            var userRole = HttpContext.Request.Headers["X-USER-ROLE"].FirstOrDefault();
            if (userRole?.ToLower() != "manager")
            {
                _logger.LogWarning("Non-manager user {MedewGcId} attempted to review time entries", medewGcId);
                return StatusCode(403, new { error = "Only managers can review time entries" });
            }

            _logger.LogInformation(
                "POST /api/workflow/review by manager {MedewGcId}, {Count} entries, approve={Approve}",
                medewGcId, request.EntryIds.Count, request.Approve);

            var response = await _workflowService.ReviewEntriesAsync(medewGcId.Value, request);

            if (!response.Success && response.Errors.Any())
            {
                return BadRequest(response);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reviewing entries");
            return StatusCode(500, new { error = "Failed to review entries", details = ex.Message });
        }
    }

    private int? ResolveMedewGcId()
    {
        if (HttpContext.Items.TryGetValue("MedewGcId", out var medewObj))
        {
            return (int)medewObj;
        }

        if (Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var header) &&
            int.TryParse(header.ToString(), out var medewId))
        {
            return medewId;
        }

        return null;
    }
}
