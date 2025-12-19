using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Domain;
using Microsoft.Extensions.Logging;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VacationController : ControllerBase
    {
        private readonly VacationService _vacationService;
        private readonly ILogger<VacationController> _logger;

        public VacationController(VacationService vacationService, ILogger<VacationController> logger)
        {
            _vacationService = vacationService;
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
                // Temporarily get all requests to debug
                var allRequests = await _vacationService.GetAllVacationRequestsAsync();
                _logger.LogInformation("Found {Count} total vacation requests", allRequests.Count());

                var requests = await _vacationService.GetVacationRequestsByUserIdAsync(medewGcId.Value);
                _logger.LogInformation("Found {Count} vacation requests for user {UserId}", requests.Count(), medewGcId.Value);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vacation requests for user {UserId}", medewGcId.Value);
                return StatusCode(500, new { error = "Failed to fetch vacation requests", details = ex.Message });
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
            await _vacationService.ApproveVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
            return NoContent();
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectVacationRequest(int id, [FromBody] ReviewRequest request)
        {
            await _vacationService.RejectVacationRequestAsync(id, request.ManagerComment, request.ReviewedBy);
            return NoContent();
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
