using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VacationController : ControllerBase
    {
        private readonly VacationService _vacationService;

        public VacationController(VacationService vacationService)
        {
            _vacationService = vacationService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VacationRequest>>> GetVacationRequests()
        {
            var requests = await _vacationService.GetAllVacationRequestsAsync();
            return Ok(requests);
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
    }
}
