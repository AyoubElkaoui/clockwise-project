using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace backend.controllers 
{
    [Route("api/vacation-requests")]
    [ApiController]
    public class VacationRequestsController : ControllerBase
    {
        private readonly ClockwiseDbContext _context;

        public VacationRequestsController(ClockwiseDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET: api/vacation-requests
        /// Haal alle vakantie-aanvragen op voor de huidige gebruiker
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetVacationRequests([FromQuery] int? userId = null)
        {
            try
            {
                var query = _context.VacationRequests
                    .Include(v => v.User)
                    .Include(v => v.ProcessedByUser) // Include processing admin info
                    .AsQueryable();

                // Filter op userId als opgegeven
                if (userId.HasValue)
                {
                    query = query.Where(v => v.UserId == userId.Value);
                }

                var requests = await query
                    .OrderByDescending(v => v.StartDate)
                    .Select(v => new
                    {
                        v.Id,
                        v.UserId,
                        v.StartDate,
                        v.EndDate,
                        v.Hours,
                        v.Reason,
                        v.Status,
                        v.RequestDate,
                        ProcessedBy = v.ProcessedBy,
                        ProcessedDate = v.ProcessedDate,
                        ProcessingNotes = v.ProcessingNotes,
                        User = new
                        {
                            v.User.Id,
                            v.User.FirstName,
                            v.User.LastName,
                            FullName = $"{v.User.FirstName} {v.User.LastName}"
                        },
                        ProcessedByUser = v.ProcessedByUser != null ? new
                        {
                            Id = v.ProcessedByUser.Id,
                            FirstName = v.ProcessedByUser.FirstName,
                            LastName = v.ProcessedByUser.LastName,
                            FullName = $"{v.ProcessedByUser.FirstName} {v.ProcessedByUser.LastName}"
                        } : null
                    })
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij ophalen vakantie-aanvragen: {ex.Message}");
            }
        }

        /// <summary>
        /// GET: api/vacation-requests/balance/{userId}
        /// Haal vakantie balans op voor een specifieke gebruiker
        /// </summary>
        [HttpGet("balance/{userId}")]
        public async Task<ActionResult<object>> GetVacationBalance(int userId)
        {
            try
            {
                var currentYear = DateTime.Now.Year;
                
                // Controleer of gebruiker bestaat
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                    return NotFound($"Gebruiker met ID {userId} niet gevonden");

                // Haal alle vakantie-aanvragen voor deze gebruiker in het huidige jaar
                var userRequests = await _context.VacationRequests
                    .Where(v => v.UserId == userId && v.StartDate.Year == currentYear)
                    .ToListAsync();

                // Bereken gebruikte uren (goedgekeurde aanvragen)
                var usedHours = userRequests
                    .Where(v => v.Status == "approved")
                    .Sum(v => v.Hours);

                // Bereken uren in behandeling
                var pendingHours = userRequests
                    .Where(v => v.Status == "pending")
                    .Sum(v => v.Hours);

                // Totaal vakantie-uren per jaar (aanpasbaar per bedrijf)
                var totalHours = await GetTotalVacationHoursForUser(userId);
                
                // Beschikbare uren = totaal - gebruikt - in behandeling
                var remainingHours = totalHours - usedHours - pendingHours;

                var balance = new
                {
                    totalHours = totalHours,
                    usedHours = usedHours,
                    pendingHours = pendingHours,
                    remainingHours = Math.Max(0, remainingHours), // Zorg dat het niet negatief wordt
                    year = currentYear,
                    totalDays = totalHours / 8,
                    usedDays = usedHours / 8,
                    pendingDays = pendingHours / 8,
                    remainingDays = Math.Max(0, remainingHours) / 8
                };

                return Ok(balance);
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij ophalen vakantie balans: {ex.Message}");
            }
        }

    /// <summary>
    /// POST: api/vacation-requests
    /// Maak een nieuwe vakantie-aanvraag aan - UPDATED: Direct admin approval for managers/admins
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateVacationRequest([FromBody] VacationRequest vacation)
    {
        if (vacation == null)
            return BadRequest("Ongeldige invoer");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Valideer datums
            if (vacation.EndDate < vacation.StartDate)
                return BadRequest("Einddatum moet na startdatum liggen");

            if (vacation.StartDate.Date < DateTime.Now.Date)
                return BadRequest("Je kunt geen vakantie in het verleden aanvragen");

            // Bereken werkdagen en uren
            var workingDays = CalculateWorkingDays(vacation.StartDate, vacation.EndDate);
            vacation.Hours = workingDays * 8; // 8 uur per werkdag

            if (vacation.Hours <= 0)
                return BadRequest("Geen werkdagen geselecteerd");

            // Get user info to determine approval process
            var user = await _context.Users.FindAsync(vacation.UserId);
            if (user == null)
                return BadRequest("Gebruiker niet gevonden");

            // Controleer huidige vakantie balans (inclusief pending)
            var currentBalance = await GetVacationBalanceInternal(vacation.UserId);
        
            if (vacation.Hours > currentBalance.remainingHours)
                return BadRequest($"Onvoldoende vakantie-uren. Je hebt {currentBalance.remainingHours} uur beschikbaar, maar vraagt {vacation.Hours} uur aan.");

            // Controleer voor overlappende aanvragen
            var overlappingRequests = await _context.VacationRequests
                .Where(v => v.UserId == vacation.UserId && 
                        v.Status != "rejected" &&
                        ((v.StartDate <= vacation.EndDate && v.EndDate >= vacation.StartDate)))
                .ToListAsync();

            if (overlappingRequests.Any())
                return BadRequest("Je hebt al een vakantie-aanvraag in deze periode.");

            // UPDATED: Different approval process based on user rank
            if (user.Rank == "manager" || user.Rank == "admin")
            {
                // DIRECT ADMIN APPROVAL: Skip manager step for managers and admins
                vacation.Status = "manager_approved"; // Skip to admin approval step
                vacation.ManagerApprovedBy = vacation.UserId; // Self-approval tracking
                vacation.ManagerApprovedDate = DateTime.Now;
                vacation.ManagerApprovalNotes = $"Auto-approved: {user.Rank} request bypasses manager approval";
            
                Console.WriteLine($"Manager/Admin request {vacation.Id} auto-advanced to admin approval stage");
            }
            else
            {
                // NORMAL TWO-STEP: Regular users go through manager first
                vacation.Status = "pending";
            }

            // Voeg vakantie-aanvraag toe
            _context.VacationRequests.Add(vacation);

            // Voeg activiteit toe - different message based on approval path
            var activity = new Activity
            {
                UserId = vacation.UserId,
                Type = "vacation",
                Action = "submitted",
                Message = user.Rank == "manager" || user.Rank == "admin" 
                    ? $"Vakantie-aanvraag van {vacation.StartDate:dd-MM-yyyy} tot {vacation.EndDate:dd-MM-yyyy} is ingediend (direct naar admin)"
                    : $"Vakantie-aanvraag van {vacation.StartDate:dd-MM-yyyy} tot {vacation.EndDate:dd-MM-yyyy} is ingediend",
                Details = $"Uren: {vacation.Hours}, Reden: {vacation.Reason ?? "Geen reden opgegeven"}, Approval path: {(user.Rank == "manager" || user.Rank == "admin" ? "Direct admin" : "Manager then admin")}"
            };

            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { 
                success = true, 
                id = vacation.Id,
                message = user.Rank == "manager" || user.Rank == "admin" 
                    ? "Vakantie-aanvraag succesvol ingediend en doorgestuurd naar admin!" 
                    : "Vakantie-aanvraag succesvol ingediend!",
                hours = vacation.Hours,
                status = vacation.Status,
                approvalPath = user.Rank == "manager" || user.Rank == "admin" ? "direct_admin" : "two_step"
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Fout bij aanmaken vakantie-aanvraag: {ex.Message}");
        }
    }

        /// <summary>
        /// PUT: api/vacation-requests/{id}
        /// Werk een vakantie-aanvraag bij (alleen pending aanvragen)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVacationRequest(int id, [FromBody] VacationRequest updatedVacation)
        {
            if (id != updatedVacation.Id)
                return BadRequest("ID mismatch");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var existingVacation = await _context.VacationRequests.FindAsync(id);
                if (existingVacation == null)
                    return NotFound();

                // Alleen pending aanvragen kunnen worden bijgewerkt
                if (existingVacation.Status != "pending")
                    return BadRequest("Alleen aanvragen in behandeling kunnen worden bijgewerkt");

                // Valideer nieuwe datums
                if (updatedVacation.EndDate < updatedVacation.StartDate)
                    return BadRequest("Einddatum moet na startdatum liggen");

                if (updatedVacation.StartDate.Date < DateTime.Now.Date)
                    return BadRequest("Je kunt geen vakantie in het verleden aanvragen");

                // Bereken nieuwe uren
                var newWorkingDays = CalculateWorkingDays(updatedVacation.StartDate, updatedVacation.EndDate);
                var newHours = newWorkingDays * 8;

                if (newHours <= 0)
                    return BadRequest("Geen werkdagen geselecteerd");

                // Controleer balans (exclusief huidige aanvraag)
                var currentBalance = await GetVacationBalanceInternal(existingVacation.UserId);
                var availableHours = currentBalance.remainingHours + existingVacation.Hours; // Tel huidige aanvraag er weer bij op
                
                if (newHours > availableHours)
                    return BadRequest($"Onvoldoende vakantie-uren. Je hebt {availableHours} uur beschikbaar, maar vraagt {newHours} uur aan.");

                // Controleer voor overlappende aanvragen (exclusief huidige)
                var overlappingRequests = await _context.VacationRequests
                    .Where(v => v.UserId == existingVacation.UserId && 
                               v.Id != id &&
                               v.Status != "rejected" &&
                               ((v.StartDate <= updatedVacation.EndDate && v.EndDate >= updatedVacation.StartDate)))
                    .ToListAsync();

                if (overlappingRequests.Any())
                    return BadRequest("Je hebt al een vakantie-aanvraag in deze periode.");

                // Update eigenschappen
                existingVacation.StartDate = updatedVacation.StartDate;
                existingVacation.EndDate = updatedVacation.EndDate;
                existingVacation.Reason = updatedVacation.Reason;
                existingVacation.Hours = newHours;

                _context.Entry(existingVacation).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok("Vakantie-aanvraag bijgewerkt");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Fout bij bijwerken: {ex.Message}");
            }
        }

        /// <summary>
        /// DELETE: api/vacation-requests/{id}
        /// Verwijder een vakantie-aanvraag (alleen pending)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacationRequest(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var vacation = await _context.VacationRequests.FindAsync(id);
                if (vacation == null)
                    return NotFound();

                // Alleen pending aanvragen kunnen worden verwijderd
                if (vacation.Status != "pending")
                    return BadRequest("Alleen aanvragen in behandeling kunnen worden verwijderd");

                // Voeg activiteit toe
                var activity = new Activity
                {
                    UserId = vacation.UserId,
                    Type = "vacation",
                    Action = "cancelled",
                    Message = $"Vakantie-aanvraag van {vacation.StartDate:dd-MM-yyyy} tot {vacation.EndDate:dd-MM-yyyy} is geannuleerd",
                    Details = $"Uren: {vacation.Hours} teruggebracht naar beschikbaar saldo"
                };

                _context.Activities.Add(activity);
                _context.VacationRequests.Remove(vacation);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                return Ok("Vakantie-aanvraag verwijderd");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Fout bij verwijderen: {ex.Message}");
            }
        }

        /// <summary>
        /// Helper methode: Bereken aantal werkdagen tussen twee datums
        /// </summary>
        private int CalculateWorkingDays(DateTime startDate, DateTime endDate)
        {
            var workingDays = 0;
            var currentDate = startDate.Date;

            while (currentDate <= endDate.Date)
            {
                // Tel alleen werkdagen (maandag = 1, vrijdag = 5)
                if (currentDate.DayOfWeek >= DayOfWeek.Monday && currentDate.DayOfWeek <= DayOfWeek.Friday)
                {
                    workingDays++;
                }
                currentDate = currentDate.AddDays(1);
            }

            return workingDays;
        }

        /// <summary>
        /// Helper methode: Haal vakantie balans op (interne gebruik)
        /// </summary>
        private async Task<(double totalHours, double usedHours, double pendingHours, double remainingHours)> GetVacationBalanceInternal(int userId)
        {
            var currentYear = DateTime.Now.Year;
            
            var userRequests = await _context.VacationRequests
                .Where(v => v.UserId == userId && v.StartDate.Year == currentYear)
                .ToListAsync();

            var usedHours = userRequests
                .Where(v => v.Status == "approved")
                .Sum(v => v.Hours);

            var pendingHours = userRequests
                .Where(v => v.Status == "pending")
                .Sum(v => v.Hours);

            var totalHours = await GetTotalVacationHoursForUser(userId);
            var remainingHours = totalHours - usedHours - pendingHours;

            return (totalHours, usedHours, pendingHours, Math.Max(0, remainingHours));
        }

        /// <summary>
        /// Helper methode: Bepaal totaal aantal vakantie-uren voor een gebruiker
        /// </summary>
        private async Task<double> GetTotalVacationHoursForUser(int userId)
        {
            // Voor nu een vaste waarde, later kun je dit uit een contract-tabel halen
            return 200.0; // 25 dagen * 8 uur = 200 uur (standaard Nederlandse vakantiedagen)
        }
    }
}