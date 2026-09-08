using backend.Models;
using backend.Services;
using backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/workflow")]
public class WorkflowController : ControllerBase
{
    private const string NoIdentityMessage = "Geen medewerker-identiteit in het token";
    private const string ManagerOnlyMessage = "Alleen managers of beheerders mogen urenregistraties beoordelen";

    private readonly WorkflowService _workflowService;
    private readonly ILogger<WorkflowController> _logger;
    private readonly INotificationRepository _notificationRepo;

    public WorkflowController(
        WorkflowService workflowService,
        ILogger<WorkflowController> logger,
        INotificationRepository notificationRepo)
    {
        _workflowService = workflowService;
        _logger = logger;
        _notificationRepo = notificationRepo;
    }

    /// <summary>
    /// POST /api/workflow/draft
    /// </summary>
    [HttpPost("draft")]
    public async Task<ActionResult<DraftResponse>> SaveDraft([FromBody] SaveDraftRequest? request)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (request == null)
            return BadRequest(new { error = "Ongeldige aanvraag" });

        try
        {
            var response = await _workflowService.SaveDraftAsync(medewGcId.Value, request);

            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving draft for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij opslaan concept" });
        }
    }

    /// <summary>
    /// GET /api/workflow/drafts?urenperGcId=
    /// </summary>
    [HttpGet("drafts")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetDrafts([FromQuery] int urenperGcId)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        try
        {
            var response = await _workflowService.GetDraftsAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching drafts for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen concepten" });
        }
    }

    /// <summary>
    /// GET /api/workflow/submitted?urenperGcId=
    /// </summary>
    [HttpGet("submitted")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetSubmitted([FromQuery] int urenperGcId)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        try
        {
            var response = await _workflowService.GetSubmittedAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching submitted entries for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen ingediende uren" });
        }
    }

    /// <summary>
    /// GET /api/workflow/rejected?urenperGcId=
    /// </summary>
    [HttpGet("rejected")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetRejected([FromQuery] int urenperGcId)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        try
        {
            var response = await _workflowService.GetRejectedAsync(medewGcId.Value, urenperGcId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching rejected entries for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen afgekeurde uren" });
        }
    }

    /// <summary>
    /// POST /api/workflow/submit
    /// </summary>
    [HttpPost("submit")]
    public async Task<ActionResult<WorkflowResponse>> SubmitEntries([FromBody] SubmitTimeEntriesRequest? request)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (request == null || request.EntryIds == null || request.EntryIds.Count == 0)
            return BadRequest(new { error = "Geen uren geselecteerd om in te dienen" });

        try
        {
            _logger.LogInformation(
                "POST /api/workflow/submit for employee {MedewGcId}, {Count} entries",
                medewGcId, request.EntryIds.Count);

            var response = await _workflowService.SubmitEntriesAsync(medewGcId.Value, request);

            if (!response.Success)
                return BadRequest(response);

            try
            {
                await _notificationRepo.NotifyManagerForEmployeeAsync(medewGcId.Value, new CreateNotificationDto
                {
                    Type = "timesheet_submitted",
                    Title = "Nieuwe timesheet ingediend",
                    Message = "{firstName} {lastName} heeft een timesheet ingediend voor goedkeuring",
                    RelatedEntityType = "timesheet",
                    RelatedEntityId = request.UrenperGcId
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify manager for employee {MedewGcId}", medewGcId);
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting entries for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij indienen uren" });
        }
    }

    /// <summary>
    /// POST /api/workflow/resubmit
    /// </summary>
    [HttpPost("resubmit")]
    public async Task<ActionResult<WorkflowResponse>> ResubmitRejected([FromBody] SubmitTimeEntriesRequest? request)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (request == null || request.EntryIds == null || request.EntryIds.Count == 0)
            return BadRequest(new { error = "Geen uren geselecteerd om opnieuw in te dienen" });

        try
        {
            var response = await _workflowService.ResubmitRejectedEntriesAsync(medewGcId.Value, request);

            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resubmitting entries for {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij opnieuw indienen uren" });
        }
    }

    /// <summary>
    /// DELETE /api/workflow/draft/{id}
    /// </summary>
    [HttpDelete("draft/{id:int}")]
    public async Task<ActionResult<WorkflowResponse>> DeleteDraft(int id)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        try
        {
            var response = await _workflowService.DeleteDraftAsync(medewGcId.Value, id);

            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting draft {Id} for {MedewGcId}", id, medewGcId);
            return StatusCode(500, new { error = "Fout bij verwijderen concept" });
        }
    }

    /// <summary>
    /// GET /api/workflow/review/pending?urenperGcId=  (manager/admin)
    /// </summary>
    [HttpGet("review/pending")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetPendingReview([FromQuery] int urenperGcId)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (!this.IsManagerOrAdmin())
            return ManagerForbidden(medewGcId.Value, "review time entries");

        try
        {
            var response = await _workflowService.GetAllSubmittedForReviewAsync(urenperGcId, medewGcId.Value);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending reviews for manager {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij ophalen te beoordelen uren" });
        }
    }

    /// <summary>
    /// GET /api/workflow/entries?urenperGcId=&status=  (manager/admin)
    /// </summary>
    [HttpGet("entries")]
    public async Task<ActionResult<WorkflowEntriesResponse>> GetEntries(
        [FromQuery] int urenperGcId,
        [FromQuery] string? status = null)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (!this.IsManagerOrAdmin())
            return ManagerForbidden(medewGcId.Value, "view all entries");

        try
        {
            var response = await _workflowService.GetAllEntriesByPeriodAsync(urenperGcId, status);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching entries for period {UrenperGcId}", urenperGcId);
            return StatusCode(500, new { error = "Fout bij ophalen uren" });
        }
    }

    /// <summary>
    /// POST /api/workflow/review  (manager/admin)
    /// </summary>
    [HttpPost("review")]
    public async Task<ActionResult<WorkflowResponse>> ReviewEntries([FromBody] ReviewTimeEntriesRequest? request)
    {
        var medewGcId = this.CurrentMedewGcId();
        if (medewGcId == null)
            return Unauthorized(new { error = NoIdentityMessage });

        if (!this.IsManagerOrAdmin())
            return ManagerForbidden(medewGcId.Value, "review time entries");

        if (request == null || request.EntryIds == null || request.EntryIds.Count == 0)
            return BadRequest(new { error = "Geen uren geselecteerd om te beoordelen" });

        try
        {
            _logger.LogInformation(
                "POST /api/workflow/review by manager {MedewGcId}, {Count} entries, approve={Approve}",
                medewGcId, request.EntryIds.Count, request.Approve);

            var response = await _workflowService.ReviewEntriesAsync(medewGcId.Value, request);

            if (!response.Success && response.Errors.Any())
                return BadRequest(response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reviewing entries by manager {MedewGcId}", medewGcId);
            return StatusCode(500, new { error = "Fout bij beoordelen uren" });
        }
    }

    private ObjectResult ManagerForbidden(int medewGcId, string action)
    {
        _logger.LogWarning("User {MedewGcId} with role {Role} attempted to {Action}", medewGcId, this.CurrentRole(), action);
        return StatusCode(403, new { error = ManagerOnlyMessage });
    }
}
