using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
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
        private readonly ILogger<VacationController> _logger;

        public VacationController(
            VacationService vacationService, 
            IFirebirdDataRepository firebirdRepo,
            ILogger<VacationController> logger)
        {
            _vacationService = vacationService;
            _firebirdRepo = firebirdRepo;
            _logger = logger;
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
        public async Task<ActionResult<IEnumerable<VacationRequest>>> GetAllVacationRequests()
        {
            _logger.LogInformation("GetAllVacationRequests called - returning ALL vacation requests for managers");
            
            try
            {
                var requests = await _vacationService.GetAllVacationRequestsAsync();
                _logger.LogInformation("Found {Count} total vacation requests", requests.Count());
                return Ok(requests);
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
                await _vacationService.ApproveVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
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
                await _vacationService.RejectVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
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
