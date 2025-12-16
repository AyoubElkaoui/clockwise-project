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
    public class TimesheetsController : ControllerBase
    {
        private readonly TimesheetService _timesheetService;

        public TimesheetsController(TimesheetService timesheetService)
        {
            _timesheetService = timesheetService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Timesheet>>> GetTimesheets()
        {
            var timesheets = await _timesheetService.GetAllTimesheetsAsync();
            return Ok(timesheets);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Timesheet>> GetTimesheet(int id)
        {
            var timesheet = await _timesheetService.GetTimesheetByIdAsync(id);
            if (timesheet == null)
            {
                return NotFound();
            }
            return Ok(timesheet);
        }

        [HttpPost]
        public async Task<ActionResult<Timesheet>> CreateTimesheet(Timesheet timesheet)
        {
            await _timesheetService.AddTimesheetAsync(timesheet);
            return CreatedAtAction(nameof(GetTimesheet), new { id = timesheet.Id }, timesheet);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTimesheet(int id, Timesheet timesheet)
        {
            if (id != timesheet.Id)
            {
                return BadRequest();
            }
            await _timesheetService.UpdateTimesheetAsync(timesheet);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTimesheet(int id)
        {
            await _timesheetService.DeleteTimesheetAsync(id);
            return NoContent();
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveTimesheet(int id, [FromBody] ReviewRequest request)
        {
            await _timesheetService.ApproveTimesheetAsync(id, request.ManagerComment, request.ReviewedBy);
            return NoContent();
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectTimesheet(int id, [FromBody] ReviewRequest request)
        {
            await _timesheetService.RejectTimesheetAsync(id, request.ManagerComment, request.ReviewedBy);
            return NoContent();
        }
    }
}
