using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Collections.Generic;

namespace backend.controllers 
{
    [Route("api/vacation-balance")]
    [ApiController]
    public class VacationBalanceController : ControllerBase
    {
        private readonly ClockwiseDbContext _context;

        public VacationBalanceController(ClockwiseDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET: api/vacation-balance
        /// Haal vakantie balans op voor huidige gebruiker (uit sessie/token)
        /// Voor nu gebruiken we een standaard userId - implementeer later authenticatie
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<object>> GetCurrentUserVacationBalance()
        {
            // Voor nu gebruiken we een standaard userId
            // Later kun je dit uit de authenticatie/sessie halen
            var userId = 1; // Of haal uit claims/session: User.FindFirst("UserId")?.Value
            
            return await GetVacationBalanceForUser(userId);
        }

        /// <summary>
        /// GET: api/vacation-balance/{userId}
        /// Haal vakantie balans op voor specifieke gebruiker
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<ActionResult<object>> GetVacationBalance(int userId)
        {
            return await GetVacationBalanceForUser(userId);
        }

        /// <summary>
        /// GET: api/vacation-balance/summary/{userId}
        /// Uitgebreide samenvatting van vakantie balans met historische data
        /// </summary>
        [HttpGet("summary/{userId}")]
        public async Task<ActionResult<object>> GetVacationBalanceSummary(int userId)
        {
            try
            {
                var currentYear = DateTime.Now.Year;
                
                // Controleer of gebruiker bestaat
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                    return NotFound($"Gebruiker met ID {userId} niet gevonden");

                // Haal alle vakantie-aanvragen voor deze gebruiker
                var userRequests = await _context.VacationRequests
                    .Where(v => v.UserId == userId && v.StartDate.Year == currentYear)
                    .OrderByDescending(v => v.StartDate)
                    .ToListAsync();

                // Statistieken per status
                var approved = userRequests.Where(v => v.Status == "approved").ToList();
                var pending = userRequests.Where(v => v.Status == "pending").ToList();
                var rejected = userRequests.Where(v => v.Status == "rejected").ToList();

                var totalHours = await GetTotalVacationHoursForUser(userId);
                var usedHours = approved.Sum(v => v.Hours);
                var pendingHours = pending.Sum(v => v.Hours);
                var remainingHours = totalHours - usedHours - pendingHours;

                // Bereken historische data (vorig jaar)
                var lastYear = currentYear - 1;
                var lastYearRequests = await _context.VacationRequests
                    .Where(v => v.UserId == userId && v.StartDate.Year == lastYear)
                    .ToListAsync();

                var lastYearUsed = lastYearRequests
                    .Where(v => v.Status == "approved")
                    .Sum(v => v.Hours);

                // Maandelijkse breakdown voor dit jaar
                var monthlyData = Enumerable.Range(1, 12).Select(month => new
                {
                    month,
                    monthName = new DateTime(currentYear, month, 1).ToString("MMMM"),
                    requests = userRequests.Count(v => v.StartDate.Month == month || v.EndDate.Month == month),
                    approvedHours = userRequests
                        .Where(v => v.Status == "approved" && (v.StartDate.Month == month || v.EndDate.Month == month))
                        .Sum(v => v.Hours),
                    pendingHours = userRequests
                        .Where(v => v.Status == "pending" && (v.StartDate.Month == month || v.EndDate.Month == month))
                        .Sum(v => v.Hours)
                }).ToList();

                var summary = new
                {
                    user = new
                    {
                        id = user.Id,
                        fullName = $"{user.FirstName} {user.LastName}",
                        firstName = user.FirstName,
                        lastName = user.LastName
                    },
                    currentYear = new
                    {
                        year = currentYear,
                        totalHours = totalHours,
                        usedHours = usedHours,
                        pendingHours = pendingHours,
                        remainingHours = Math.Max(0, remainingHours),
                        utilizationPercentage = totalHours > 0 ? Math.Round((usedHours / totalHours) * 100, 1) : 0
                    },
                    previousYear = new
                    {
                        year = lastYear,
                        totalHours = totalHours, // Assumeer zelfde aantal uren
                        usedHours = lastYearUsed,
                        utilizationPercentage = totalHours > 0 ? Math.Round((lastYearUsed / totalHours) * 100, 1) : 0
                    },
                    statistics = new
                    {
                        totalRequests = userRequests.Count,
                        approvedRequests = approved.Count,
                        pendingRequests = pending.Count,
                        rejectedRequests = rejected.Count,
                        approvalRate = userRequests.Count > 0 ? Math.Round((double)approved.Count / userRequests.Count * 100, 1) : 0,
                        averageRequestDays = userRequests.Count > 0 ? Math.Round(userRequests.Average(v => v.Hours / 8), 1) : 0,
                        longestVacation = userRequests.Count > 0 ? userRequests.Max(v => v.Hours / 8) : 0
                    },
                    monthlyBreakdown = monthlyData,
                    upcomingVacations = approved
                        .Where(v => v.StartDate >= DateTime.Now.Date)
                        .OrderBy(v => v.StartDate)
                        .Take(5)
                        .Select(v => new
                        {
                            v.Id,
                            v.StartDate,
                            v.EndDate,
                            v.Hours,
                            days = Math.Round(v.Hours / 8, 1),
                            v.Reason,
                            daysUntilStart = (v.StartDate - DateTime.Now.Date).Days
                        })
                        .ToList(),
                    recentActivity = userRequests
                        .Take(10)
                        .Select(v => new
                        {
                            v.Id,
                            v.StartDate,
                            v.EndDate,
                            v.Hours,
                            v.Status,
                            v.Reason,
                            requestDate = DateTime.Now // Of echte requestDate als je die hebt
                        })
                        .ToList()
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij ophalen vakantie samenvatting: {ex.Message}");
            }
        }

        /// <summary>
        /// GET: api/vacation-balance/team-overview
        /// Overzicht van vakantie balansen voor hele team (admin functie)
        /// </summary>
        [HttpGet("team-overview")]
        public async Task<ActionResult<object>> GetTeamVacationOverview()
        {
            try
            {
                var users = await _context.Users.ToListAsync();
                var currentYear = DateTime.Now.Year;
                
                var teamOverview = new List<object>();

                foreach (var user in users)
                {
                    var balance = await GetVacationBalanceInternal(user.Id);
                    
                    // Haal recent requests op
                    var recentRequests = await _context.VacationRequests
                        .Where(v => v.UserId == user.Id && v.StartDate.Year == currentYear)
                        .CountAsync();

                    var pendingCount = await _context.VacationRequests
                        .CountAsync(v => v.UserId == user.Id && v.Status == "pending");

                    teamOverview.Add(new
                    {
                        user = new
                        {
                            id = user.Id,
                            fullName = $"{user.FirstName} {user.LastName}",
                            firstName = user.FirstName,
                            lastName = user.LastName
                        },
                        balance = new
                        {
                            balance.totalHours,
                            balance.usedHours,
                            balance.pendingHours,
                            balance.remainingHours,
                            utilizationPercentage = balance.totalHours > 0 ? Math.Round((balance.usedHours / balance.totalHours) * 100, 1) : 0,
                            riskLevel = GetVacationRiskLevel(balance.remainingHours, balance.totalHours)
                        },
                        activity = new
                        {
                            totalRequests = recentRequests,
                            pendingRequests = pendingCount
                        }
                    });
                }

                return Ok(new
                {
                    teamStats = new
                    {
                        totalEmployees = users.Count,
                        averageUtilization = teamOverview.Count > 0 
                            ? Math.Round(teamOverview.Average(x => ((dynamic)x).balance.utilizationPercentage), 1) 
                            : 0,
                        employeesWithLowBalance = teamOverview.Count(x => ((dynamic)x).balance.remainingHours < 40),
                        totalPendingRequests = teamOverview.Sum(x => ((dynamic)x).activity.pendingRequests)
                    },
                    employees = teamOverview.OrderBy(x => ((dynamic)x).user.fullName)
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij ophalen team overzicht: {ex.Message}");
            }
        }

        /// <summary>
        /// POST: api/vacation-balance/{userId}/adjust
        /// Handmatig aanpassen van vakantie balans (admin functie)
        /// </summary>
        [HttpPost("{userId}/adjust")]
        public async Task<IActionResult> AdjustVacationBalance(int userId, [FromBody] VacationBalanceAdjustmentDto dto)
        {
            try
            {
                // Controleer of gebruiker bestaat
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                    return NotFound("Gebruiker niet gevonden");

                // Voor nu loggen we dit alleen als activiteit
                // Later kun je een aparte tabel maken voor balans aanpassingen
                var activity = new Activity
                {
                    UserId = userId,
                    Type = "vacation_balance",
                    Action = "manual_adjustment",
                    Message = $"Vakantie balans handmatig aangepast: {dto.AdjustmentHours} uur",
                    Details = $"Reden: {dto.Reason}. Nieuwe balans wordt berekend bij volgende aanvraag."
                };

                _context.Activities.Add(activity);
                await _context.SaveChangesAsync();

                return Ok("Vakantie balans aanpassing geregistreerd");
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij aanpassen vakantie balans: {ex.Message}");
            }
        }

        /// <summary>
        /// Helper methode om vakantie balans op te halen
        /// </summary>
        private async Task<ActionResult<object>> GetVacationBalanceForUser(int userId)
        {
            try
            {
                var currentYear = DateTime.Now.Year;
                
                // Controleer of gebruiker bestaat
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!userExists)
                    return NotFound($"Gebruiker met ID {userId} niet gevonden");

                var balance = await GetVacationBalanceInternal(userId);

                var balanceResponse = new
                {
                    userId = userId,
                    year = currentYear,
                    totalHours = balance.totalHours,
                    usedHours = balance.usedHours,
                    pendingHours = balance.pendingHours,
                    remainingHours = balance.remainingHours,
                    // Extra informatie voor frontend
                    totalDays = balance.totalHours / 8,
                    usedDays = balance.usedHours / 8,
                    pendingDays = balance.pendingHours / 8,
                    remainingDays = balance.remainingHours / 8,
                    utilizationPercentage = balance.totalHours > 0 ? Math.Round((balance.usedHours / balance.totalHours) * 100, 1) : 0,
                    warningLevel = GetVacationWarningLevel(balance.remainingHours),
                    lastUpdated = DateTime.Now
                };

                return Ok(balanceResponse);
            }
            catch (Exception ex)
            {
                return BadRequest($"Fout bij ophalen vakantie balans: {ex.Message}");
            }
        }

        /// <summary>
        /// Helper methode: Bereken vakantie balans voor gebruiker
        /// </summary>
        private async Task<(double totalHours, double usedHours, double pendingHours, double remainingHours)> GetVacationBalanceInternal(int userId)
        {
            var currentYear = DateTime.Now.Year;
            
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
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return 200.0; // Standaard waarde
            
            // Voor nu altijd 200 uur
            return 200.0;
        }

        /// <summary>
        /// Helper methode: Bepaal waarschuwingsniveau voor resterende uren
        /// </summary>
        private string GetVacationWarningLevel(double remainingHours)
        {
            if (remainingHours < 0) return "critical";      // Negatief saldo
            if (remainingHours < 16) return "high";         // Minder dan 2 dagen
            if (remainingHours < 40) return "medium";       // Minder dan 5 dagen
            return "low";                                    // Voldoende uren
        }

        /// <summary>
        /// Helper methode: Bepaal risiconiveau voor team overzicht
        /// </summary>
        private string GetVacationRiskLevel(double remainingHours, double totalHours)
        {
            var percentage = totalHours > 0 ? (remainingHours / totalHours) * 100 : 0;
            
            if (percentage < 10) return "high";     // Minder dan 10% over
            if (percentage < 25) return "medium";   // Minder dan 25% over
            return "low";                           // Voldoende over
        }
    }

    /// <summary>
    /// DTO voor vakantie balans aanpassingen
    /// </summary>
    public class VacationBalanceAdjustmentDto
    {
        public double AdjustmentHours { get; set; }  // Positief voor toevoegen, negatief voor aftrekken
        public string Reason { get; set; }           // Reden voor aanpassing
        public string AdjustedBy { get; set; }       // Wie heeft aangepast (admin naam)
    }
}