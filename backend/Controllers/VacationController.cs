using Microsoft.AspNetCore.Mvc;
using System.Data;
using Dapper;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Domain;
using ClockwiseProject.Backend.Repositories;
using backend.Controllers;
using backend.Repositories;
using backend.Models;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VacationController : ControllerBase
    {
        private const string ManagerOnlyMessage = "Alleen managers of beheerders mogen verlofaanvragen beoordelen";
        private const string NotOwnerMessage = "Je mag alleen je eigen verlofaanvragen bekijken of wijzigen";

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

        // GET: api/vacation  (eigen aanvragen)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VacationRequest>>> GetVacationRequests()
        {
            var medewGcId = this.CurrentMedewGcId();
            if (!medewGcId.HasValue)
                return Unauthorized(new { error = "Geen medewerker-identiteit in het token" });

            try
            {
                var requests = await _vacationService.GetVacationRequestsByMedewGcIdAsync(medewGcId.Value);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation requests for medew {MedewGcId}", medewGcId.Value);
                return StatusCode(500, new { error = "Fout bij ophalen verlofaanvragen" });
            }
        }

        // GET: api/vacation/all  (manager/admin)
        [HttpGet("all")]
        public async Task<IActionResult> GetAllVacationRequests()
        {
            if (!this.IsManagerOrAdmin())
                return StatusCode(403, new { error = ManagerOnlyMessage });

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

                var response = result.Select(r =>
                {
                    var row = (IDictionary<string, object?>)r;
                    var totalHours = ToDecimal(row["total_hours"]);
                    var startDate = ToDateTime(row["start_date"]);
                    var endDate = ToDateTime(row["end_date"]);

                    return new
                    {
                        id = ToInt(row["id"]),
                        userId = ToInt(row["medew_gc_id"]),
                        startDate = startDate?.ToString("yyyy-MM-dd"),
                        endDate = endDate?.ToString("yyyy-MM-dd"),
                        totalDays = Math.Round(totalHours / 8.0m, 1),
                        totalHours,
                        vacationType = row["taak_gc_id"]?.ToString() ?? "Z03",
                        notes = row["description"] as string ?? "",
                        status = row["status"] as string ?? "",
                        createdAt = ToDateTime(row["created_at"]),
                        submittedAt = ToDateTime(row["submitted_at"]),
                        reviewedAt = ToDateTime(row["reviewed_at"]),
                        reviewedBy = ToNullableInt(row["reviewed_by"]),
                        rejectionReason = row["rejection_reason"] as string,
                        user = new
                        {
                            firstName = row["first_name"] as string ?? "",
                            lastName = row["last_name"] as string ?? "",
                            email = row["email"] as string ?? ""
                        }
                    };
                }).ToList();

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all vacation requests");
                return StatusCode(500, new { error = "Fout bij ophalen verlofaanvragen" });
            }
        }

        // GET: api/vacation/types
        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<TaskModel>>> GetVacationTypes()
        {
            try
            {
                var types = await _firebirdRepo.GetVacationTasksAsync();
                return Ok(types);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation types");
                return StatusCode(500, new { error = "Fout bij ophalen verloftypes" });
            }
        }

        // GET: api/vacation/{id}  (eigenaar of manager/admin)
        [HttpGet("{id:int}")]
        public async Task<ActionResult<VacationRequest>> GetVacationRequest(int id)
        {
            try
            {
                var request = await _vacationService.GetVacationRequestByIdAsync(id);
                if (request == null)
                    return NotFound(new { error = "Verlofaanvraag niet gevonden" });

                if (!IsOwnerOrManager(request))
                    return StatusCode(403, new { error = NotOwnerMessage });

                return Ok(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation request {Id}", id);
                return StatusCode(500, new { error = "Fout bij ophalen verlofaanvraag" });
            }
        }

        // POST: api/vacation  (UserId is altijd de aanroeper)
        [HttpPost]
        public async Task<ActionResult<VacationRequest>> CreateVacationRequest([FromBody] VacationRequest? vacationRequest)
        {
            if (vacationRequest == null)
                return BadRequest(new { error = "Ongeldige aanvraag" });

            var userId = this.CurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new { error = "Niet ingelogd" });

            if (vacationRequest.EndDate.Date < vacationRequest.StartDate.Date)
                return BadRequest(new { error = "Einddatum mag niet vóór de startdatum liggen" });

            if (vacationRequest.TotalDays < 0)
                return BadRequest(new { error = "Aantal dagen mag niet negatief zijn" });

            vacationRequest.Id = 0;
            vacationRequest.UserId = userId.Value;
            vacationRequest.Status = "pending";
            vacationRequest.ReviewedBy = null;
            vacationRequest.ReviewedAt = null;
            vacationRequest.RejectionReason = null;

            try
            {
                await _vacationService.AddVacationRequestAsync(vacationRequest);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating vacation request for user {UserId}", userId);
                return StatusCode(500, new { error = "Fout bij aanmaken verlofaanvraag" });
            }

            // Notificatie sturen naar manager (best effort)
            try
            {
                var sql = @"
                    SELECT ma.manager_id, u.first_name, u.last_name
                    FROM manager_assignments ma
                    JOIN users u ON u.id = ma.employee_id
                    WHERE ma.employee_id = @UserId
                    LIMIT 1";

                var result = await _db.QueryFirstOrDefaultAsync(sql, new { UserId = userId.Value });
                if (result != null)
                {
                    var row = (IDictionary<string, object?>)result;
                    var managerId = ToNullableInt(row["manager_id"]);
                    if (managerId.HasValue)
                    {
                        await _notificationRepo.CreateAsync(new CreateNotificationDto
                        {
                            UserId = managerId.Value,
                            Type = "vacation_requested",
                            Title = "Nieuwe verlofaanvraag",
                            Message = $"{row["first_name"]} {row["last_name"]} heeft verlof aangevraagd van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy}",
                            RelatedEntityType = "vacation_request",
                            RelatedEntityId = vacationRequest.Id
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send manager notification for vacation request");
            }

            return CreatedAtAction(nameof(GetVacationRequest), new { id = vacationRequest.Id }, vacationRequest);
        }

        // PUT: api/vacation/{id}  (eigenaar of manager/admin)
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateVacationRequest(int id, [FromBody] VacationRequest? vacationRequest)
        {
            if (vacationRequest == null)
                return BadRequest(new { error = "Ongeldige aanvraag" });

            if (id != vacationRequest.Id)
                return BadRequest(new { error = "Id in URL komt niet overeen met de aanvraag" });

            if (vacationRequest.EndDate.Date < vacationRequest.StartDate.Date)
                return BadRequest(new { error = "Einddatum mag niet vóór de startdatum liggen" });

            try
            {
                var existing = await _vacationService.GetVacationRequestByIdAsync(id);
                if (existing == null)
                    return NotFound(new { error = "Verlofaanvraag niet gevonden" });

                if (!IsOwnerOrManager(existing))
                    return StatusCode(403, new { error = NotOwnerMessage });

                // Eigenaar blijft altijd de oorspronkelijke eigenaar; reviewvelden worden hier niet gewijzigd.
                vacationRequest.UserId = existing.UserId;
                if (!this.IsManagerOrAdmin())
                {
                    vacationRequest.Status = existing.Status;
                    vacationRequest.ReviewedBy = existing.ReviewedBy;
                    vacationRequest.ReviewedAt = existing.ReviewedAt;
                    vacationRequest.RejectionReason = existing.RejectionReason;
                }

                await _vacationService.UpdateVacationRequestAsync(vacationRequest);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating vacation request {Id}", id);
                return StatusCode(500, new { error = "Fout bij bijwerken verlofaanvraag" });
            }
        }

        // DELETE: api/vacation/{id}  (eigenaar of manager/admin)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteVacationRequest(int id)
        {
            try
            {
                var existing = await _vacationService.GetVacationRequestByIdAsync(id);
                if (existing == null)
                    return NotFound(new { error = "Verlofaanvraag niet gevonden" });

                if (!IsOwnerOrManager(existing))
                    return StatusCode(403, new { error = NotOwnerMessage });

                await _vacationService.DeleteVacationRequestAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting vacation request {Id}", id);
                return StatusCode(500, new { error = "Fout bij verwijderen verlofaanvraag" });
            }
        }

        // POST: api/vacation/{id}/approve  (manager/admin)
        [HttpPost("{id:int}/approve")]
        public async Task<IActionResult> ApproveVacationRequest(int id, [FromBody] ReviewRequest? request)
        {
            if (!this.IsManagerOrAdmin())
                return StatusCode(403, new { error = ManagerOnlyMessage });

            var reviewerId = this.CurrentUserId();
            if (!reviewerId.HasValue)
                return Unauthorized(new { error = "Niet ingelogd" });

            var comment = request?.ManagerComment ?? string.Empty;

            try
            {
                var vacationRequest = await _vacationService.GetVacationRequestByIdAsync(id);
                if (vacationRequest == null)
                    return NotFound(new { error = "Verlofaanvraag niet gevonden" });

                _logger.LogInformation("Approving vacation request {Id} by user {ReviewedBy}", id, reviewerId.Value);
                await _vacationService.ApproveVacationRequestAsync(id, comment, reviewerId.Value);

                await NotifyEmployeeAsync(vacationRequest, "vacation_approved", "Verlofaanvraag goedgekeurd",
                    $"Je verlofaanvraag van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy} is goedgekeurd", id);

                return Ok(new { message = "Verlofaanvraag goedgekeurd" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving vacation request {Id}", id);
                return StatusCode(500, new { error = "Fout bij goedkeuren verlofaanvraag" });
            }
        }

        // POST: api/vacation/{id}/reject  (manager/admin)
        [HttpPost("{id:int}/reject")]
        public async Task<IActionResult> RejectVacationRequest(int id, [FromBody] ReviewRequest? request)
        {
            if (!this.IsManagerOrAdmin())
                return StatusCode(403, new { error = ManagerOnlyMessage });

            var reviewerId = this.CurrentUserId();
            if (!reviewerId.HasValue)
                return Unauthorized(new { error = "Niet ingelogd" });

            var comment = request?.ManagerComment ?? string.Empty;

            try
            {
                var vacationRequest = await _vacationService.GetVacationRequestByIdAsync(id);
                if (vacationRequest == null)
                    return NotFound(new { error = "Verlofaanvraag niet gevonden" });

                _logger.LogInformation("Rejecting vacation request {Id} by user {ReviewedBy}", id, reviewerId.Value);
                await _vacationService.RejectVacationRequestAsync(id, comment, reviewerId.Value);

                await NotifyEmployeeAsync(vacationRequest, "vacation_rejected", "Verlofaanvraag afgekeurd",
                    $"Je verlofaanvraag van {vacationRequest.StartDate:dd-MM-yyyy} tot {vacationRequest.EndDate:dd-MM-yyyy} is afgekeurd. Reden: {comment}", id);

                return Ok(new { message = "Verlofaanvraag afgekeurd" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting vacation request {Id}", id);
                return StatusCode(500, new { error = "Fout bij afkeuren verlofaanvraag" });
            }
        }

        /// <summary>
        /// Bij lezen uit de repository bevat VacationRequest.UserId het medew_gc_id
        /// (zie PostgresLeaveRepository: "medew_gc_id AS UserId"), dus vergelijk met CurrentMedewGcId.
        /// </summary>
        private bool IsOwnerOrManager(VacationRequest request)
        {
            if (this.IsManagerOrAdmin()) return true;
            var medew = this.CurrentMedewGcId();
            return medew.HasValue && request.UserId == medew.Value;
        }

        private async Task NotifyEmployeeAsync(VacationRequest vacationRequest, string type, string title, string message, int relatedId)
        {
            try
            {
                // Notificaties zijn gekoppeld aan users.id; VacationRequest.UserId is hier het medew_gc_id.
                var pgUserId = await _db.QueryFirstOrDefaultAsync<int?>(
                    "SELECT id FROM users WHERE medew_gc_id = @MedewGcId",
                    new { MedewGcId = vacationRequest.UserId });

                if (!pgUserId.HasValue) return;

                await _notificationRepo.CreateAsync(new CreateNotificationDto
                {
                    UserId = pgUserId.Value,
                    Type = type,
                    Title = title,
                    Message = message,
                    RelatedEntityType = "vacation_request",
                    RelatedEntityId = relatedId
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send {Type} notification for vacation request {Id}", type, relatedId);
            }
        }

        private static int ToInt(object? value) => value == null || value is DBNull ? 0 : Convert.ToInt32(value);
        private static int? ToNullableInt(object? value) => value == null || value is DBNull ? null : Convert.ToInt32(value);
        private static decimal ToDecimal(object? value) => value == null || value is DBNull ? 0m : Convert.ToDecimal(value);
        private static DateTime? ToDateTime(object? value) => value == null || value is DBNull ? null : Convert.ToDateTime(value);
    }
}
