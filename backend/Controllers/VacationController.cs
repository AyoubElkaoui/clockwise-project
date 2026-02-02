using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data;
using Dapper;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VacationController : ControllerBase
    {
        private readonly VacationService _vacationService;
        private readonly IFirebirdDataRepository _firebirdRepo;
        private readonly IDbConnection _db;
        private readonly ILogger<VacationController> _logger;
        private readonly INotificationRepository _notificationRepo;

        public VacationController(
            VacationService vacationService,
            IFirebirdDataRepository firebirdRepo,
            IDbConnection db,
            ILogger<VacationController> logger,
            INotificationRepository notificationRepo)
        {
            _vacationService = vacationService;
            _firebirdRepo = firebirdRepo;
            _db = db;
            _logger = logger;
            _notificationRepo = notificationRepo;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VacationRequest>>> GetVacationRequests()
        {
            _logger.LogInformation("GetVacationRequests called");
            var medewGcId = ResolveMedewGcId();
            if (!medewGcId.HasValue)
            {
                _logger.LogWarning("No medewGcId resolved for vacation requests");
                return Unauthorized("Missing medewGcId");
            }

            _logger.LogInformation("Fetching vacation requests for medewGcId: {MedewGcId}", medewGcId.Value);

            try
            {
                // Get ALL vacation requests (no filtering needed, backend returns user's requests)
                var requests = await _vacationService.GetVacationRequestsByMedewGcIdAsync(medewGcId.Value);
                _logger.LogInformation("Found {Count} vacation requests for medewGcId {MedewGcId}", requests.Count(), medewGcId.Value);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation requests for user {UserId}", medewGcId.Value);
                return StatusCode(500, new { error = "Failed to fetch vacation requests", details = ex.Message });
            }
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllVacationRequests()
        {
            _logger.LogInformation("GetAllVacationRequests called - returning ALL vacation requests for managers");

            try
            {
                var sql = @"
                    SELECT
                        l.id,
                        l.medew_gc_id,
                        l.user_id,
                        l.taak_gc_id,
                        l.start_date,
                        l.end_date,
                        COALESCE(l.total_hours, 0) as total_hours,
                        l.description,
                        l.status,
                        l.created_at,
                        l.submitted_at,
                        l.reviewed_at,
                        l.reviewed_by,
                        l.rejection_reason,
                        u.first_name,
                        u.last_name,
                        u.email
                    FROM leave_requests_workflow l
                    LEFT JOIN users u ON l.medew_gc_id = u.medew_gc_id
                    ORDER BY l.created_at DESC";

                var result = await _db.QueryAsync(sql);

                var response = result.Select(r => new
                {
                    id = (int)r.id,
                    userId = (int)r.medew_gc_id,
                    startDate = ((DateTime)r.start_date).ToString("yyyy-MM-dd"),
                    endDate = ((DateTime)r.end_date).ToString("yyyy-MM-dd"),
                    totalDays = Math.Round((decimal)r.total_hours / 8.0m, 1),
                    totalHours = (decimal)r.total_hours,
                    vacationType = r.taak_gc_id?.ToString() ?? "Z03",
                    notes = r.description as string ?? "",
                    status = (string)r.status,
                    createdAt = r.created_at as DateTime?,
                    submittedAt = r.submitted_at as DateTime?,
                    reviewedAt = r.reviewed_at as DateTime?,
                    reviewedBy = r.reviewed_by as int?,
                    rejectionReason = r.rejection_reason as string,
                    user = new
                    {
                        firstName = r.first_name as string ?? "",
                        lastName = r.last_name as string ?? "",
                        email = r.email as string ?? ""
                    }
                });

                _logger.LogInformation("Found {Count} total vacation requests", response.Count());
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all vacation requests");
                return StatusCode(500, new { error = "Failed to fetch vacation requests", details = ex.Message });
            }
        }

        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<TaskModel>>> GetVacationTypes()
        {
            _logger.LogInformation("GetVacationTypes called");
            
            try
            {
                var types = await _firebirdRepo.GetVacationTasksAsync();
                _logger.LogInformation("Found {Count} vacation types", types.Count());
                return Ok(types);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation types");
                return StatusCode(500, new { error = "Failed to fetch vacation types", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<VacationRequest>> GetVacationRequest(int id)
        {
            var request = await _vacationService.GetVacationRequestByIdAsync(id);
            if (request == null)
            {
                return NotFound();
            }
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<VacationRequest>> CreateVacationRequest(VacationRequest vacationRequest)
        {
            await _vacationService.AddVacationRequestAsync(vacationRequest);
            
            // Notificatie sturen naar manager
            try
            {
                var sql = @"
                    SELECT ma.manager_id, u.first_name, u.last_name
                    FROM manager_assignments ma
                    JOIN users u ON u.id = ma.employee_id
                    WHERE ma.employee_id = @UserId
                    LIMIT 1";
                
                var result = await _db.QueryFirstOrDefaultAsync<dynamic>(sql, new { UserId = vacationRequest.UserId });
                if (result != null)
                {
                    await _notificationRepo.CreateAsync(new CreateNotificationDto
                    {
                        UserId = (int)result.manager_id,
                        Type = "vacation_requested",
                        Title = "Nieuwe verlofaanvraag",
                        Message = $"{result.first_name} {result.last_name} heeft verlof aangevraagd van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy}",
                        RelatedEntityType = "vacation_request",
                        RelatedEntityId = vacationRequest.Id
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send manager notification for vacation request");
                // Continue - don't fail the request if notification fails
            }
            
            return CreatedAtAction(nameof(GetVacationRequest), new { id = vacationRequest.Id }, vacationRequest);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVacationRequest(int id, VacationRequest vacationRequest)
        {
            if (id != vacationRequest.Id)
            {
                return BadRequest();
            }
            await _vacationService.UpdateVacationRequestAsync(vacationRequest);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacationRequest(int id)
        {
            await _vacationService.DeleteVacationRequestAsync(id);
            return NoContent();
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveVacationRequest(int id, [FromBody] ReviewRequest request)
        {
            try
            {
                _logger.LogInformation("Approving vacation request {Id} by {ReviewedBy}", id, request.ReviewedBy);
                var vacationRequest = await _vacationService.GetVacationRequestByIdAsync(id);
                await _vacationService.ApproveVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
                
                // Notificatie sturen naar medewerker
                if (vacationRequest != null)
                {
                    await _notificationRepo.CreateAsync(new CreateNotificationDto
                    {
                        UserId = vacationRequest.UserId,
                        Type = "vacation_approved",
                        Title = "Verlofaanvraag goedgekeurd",
                        Message = $"Je verlofaanvraag van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy} is goedgekeurd",
                        RelatedEntityType = "vacation_request",
                        RelatedEntityId = id
                    });
                }
                
                return Ok(new { message = "Vacation request approved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving vacation request {Id}", id);
                return StatusCode(500, new { error = "Failed to approve vacation request", details = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectVacationRequest(int id, [FromBody] ReviewRequest request)
        {
            try
            {
                _logger.LogInformation("Rejecting vacation request {Id} by {ReviewedBy}", id, request.ReviewedBy);
                var vacationRequest = await _vacationService.GetVacationRequestByIdAsync(id);
                await _vacationService.RejectVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
                
                // Notificatie sturen naar medewerker
                if (vacationRequest != null)
                {
                    await _notificationRepo.CreateAsync(new CreateNotificationDto
                    {
                        UserId = vacationRequest.UserId,
                        Type = "vacation_rejected",
                        Title = "Verlofaanvraag afgekeurd",
                        Message = $"Je verlofaanvraag van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy} is afgekeurd. Reden: {request.ManagerComment}",
                        RelatedEntityType = "vacation_request",
                        RelatedEntityId = id
                    });
                }
                
                return Ok(new { message = "Vacation request rejected successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting vacation request {Id}", id);
                return StatusCode(500, new { error = "Failed to reject vacation request", details = ex.Message });
            }
        }

        private int? ResolveMedewGcId()
        {
            if (HttpContext.Items.TryGetValue("MedewGcId", out var medewObj) && medewObj is int medewFromContext)
                return medewFromContext;

            if (Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var header) &&
                int.TryParse(header, out var medewFromHeader))
            {
                return medewFromHeader;
            }

            return null;
        }
    }
}
