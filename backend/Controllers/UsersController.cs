using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Services.Interfaces;

[Route("api/users")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly ClockwiseDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly IPasswordService _passwordService;

    public UsersController(ClockwiseDbContext context, IJwtService jwtService, IConfiguration configuration, IPasswordService passwordService)
    {
        _context = context;
        _jwtService = jwtService;
        _configuration = configuration;
        _passwordService = passwordService;
    }

    /// <summary>
    /// Helper method to get all manager IDs for a user (combines legacy ManagerId + new ManagerIds string)
    /// </summary>
    private List<int> GetUserManagerIds(User user)
    {
        var managerIds = new List<int>();
        
        try
        {
            // Add from new ManagerIds string field (comma-separated)
            if (!string.IsNullOrEmpty(user.ManagerIds))
            {
                var ids = user.ManagerIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                        .Select(id => int.TryParse(id.Trim(), out int result) ? result : (int?)null)
                                        .Where(id => id.HasValue)
                                        .Select(id => id.Value)
                                        .ToList();
                managerIds.AddRange(ids);
            }

            // Add legacy single manager ID if not already included
            if (user.ManagerId.HasValue && !managerIds.Contains(user.ManagerId.Value))
            {
                managerIds.Add(user.ManagerId.Value);
            }

            return managerIds.Distinct().ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error in GetUserManagerIds: {ex.Message}");
            
            // Fallback: try to at least return the legacy manager ID
            if (user.ManagerId.HasValue)
            {
                return new List<int> { user.ManagerId.Value };
            }
            
            return new List<int>();
        }
    }

    /// <summary>
    /// Helper method to get manager Users from manager IDs
    /// </summary>
    private async Task<List<User>> GetManagerUsers(List<int> managerIds)
    {
        try
        {
            if (!managerIds.Any()) return new List<User>();

            return await _context.Users
                .Where(u => managerIds.Contains(u.Id) && u.Rank == "manager")
                .ToListAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error in GetManagerUsers: {ex.Message}");
            return new List<User>();
        }
    }

    /// <summary>
    /// Helper method to get all users managed by a specific manager
    /// </summary>
    private async Task<List<User>> GetManagedUsers(int managerId)
    {
        try
        {
            // Get users where this manager is in their ManagerIds string OR is their legacy ManagerId
            var managedUsers = await _context.Users
                .Where(u => u.ManagerId == managerId || 
                           (u.ManagerIds != null && u.ManagerIds.Contains(managerId.ToString())))
                .ToListAsync();

            // Filter to ensure the managerId is actually a complete match (not partial)
            var filteredUsers = managedUsers.Where(u =>
            {
                if (u.ManagerId == managerId) return true;
                
                if (!string.IsNullOrEmpty(u.ManagerIds))
                {
                    try
                    {
                        var ids = u.ManagerIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                             .Select(id => int.TryParse(id.Trim(), out int result) ? result : (int?)null)
                                             .Where(id => id.HasValue)
                                             .Select(id => id.Value);
                        return ids.Contains(managerId);
                    }
                    catch
                    {
                        return false;
                    }
                }
                
                return false;
            }).ToList();

            return filteredUsers;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error in GetManagedUsers: {ex.Message}");
            return new List<User>();
        }
    }

    /// <summary>
    /// Helper method to check if a user can access another user (for manager restrictions)
    /// </summary>
    private async Task<bool> CanAccessUser(int requesterId, int targetUserId)
    {
        try
        {
            var requester = await _context.Users.FindAsync(requesterId);
            if (requester == null) return false;

            // Admins can access everyone
            if (requester.Rank == "admin") return true;

            // Users can access themselves
            if (requesterId == targetUserId) return true;

            // Managers can access their managed users
            if (requester.Rank == "manager")
            {
                var managedUsers = await GetManagedUsers(requesterId);
                return managedUsers.Any(u => u.Id == targetUserId);
            }

            return false;
        }
        catch
        {
            return false;
        }
    }

/// <summary>
/// Get all users - FIXED to properly return multiple managers
/// GET: /api/users?managerId={managerId}
/// </summary>
[HttpGet]
public async Task<ActionResult<IEnumerable<object>>> GetUsers(int? managerId = null)
{
    try
    {
        IQueryable<User> query = _context.Users.Include(u => u.Manager);

        // If managerId is specified, filter to show only managed users
        if (managerId.HasValue)
        {
            Console.WriteLine($"📋 Filtering users for manager ID: {managerId}");
            
            // Get users managed by this manager
            var managedUserIds = (await GetManagedUsers(managerId.Value)).Select(u => u.Id).ToList();
            query = query.Where(u => managedUserIds.Contains(u.Id));
        }

        var users = await query.ToListAsync();
        
        var result = new List<object>();

        foreach (var user in users)
        {
            var managerIdsList = GetUserManagerIds(user);
            var managers = await GetManagerUsers(managerIdsList);

            result.Add(new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Address,
                user.HouseNumber,
                user.PostalCode,
                user.City,
                user.LoginName,
                user.Rank,
                user.Function,
                user.ManagerId,
                user.ManagerIds, // Raw string from database
                Manager = user.Manager != null ? new
                {
                    user.Manager.Id,
                    user.Manager.FirstName,
                    user.Manager.LastName,
                    FullName = $"{user.Manager.FirstName} {user.Manager.LastName}"
                } : null,
                // FIXED: Return manager IDs in multiple formats for frontend compatibility
                AssignedManagerIds = managerIdsList, // This is what the frontend expects
                AllManagerIds = managerIdsList, // Alternative name for clarity
                Managers = managers.Select(m => new
                {
                    m.Id,
                    m.FirstName,
                    m.LastName,
                    FullName = $"{m.FirstName} {m.LastName}",
                    m.Function
                }).ToList(),
                FullName = $"{user.FirstName} {user.LastName}",
                IsAdmin = user.Rank == "admin",
                IsManager = user.Rank == "manager",
                IsNormalUser = user.Rank == "user"
            });
        }
        
        Console.WriteLine($"✅ Returning {result.Count} users" + (managerId.HasValue ? $" for manager {managerId}" : ""));
        return Ok(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error fetching users: {ex.Message}");
        return StatusCode(500, "Er is een fout opgetreden bij het ophalen van gebruikers");
    }
}

/// <summary>
/// Get single user - FIXED to properly return multiple managers
/// GET: /api/users/{id}?requesterId={requesterId}
/// </summary>
[HttpGet("{id}")]
public async Task<ActionResult<object>> GetUser(int id, int? requesterId = null)
{
    try
    {
        Console.WriteLine($"🔍 Fetching user {id}" + (requesterId.HasValue ? $" by requester {requesterId}" : ""));

        // Check access permissions if requesterId is provided
        if (requesterId.HasValue)
        {
            var canAccess = await CanAccessUser(requesterId.Value, id);
            if (!canAccess)
            {
                Console.WriteLine($"❌ Access denied: User {requesterId} cannot access user {id}");
                return Forbid("Geen toegang tot deze gebruiker");
            }
        }
        
        var user = await _context.Users
            .Include(u => u.Manager)
            .Include(u => u.ManagedUsers)
            .FirstOrDefaultAsync(u => u.Id == id);
            
        if (user == null) 
        {
            Console.WriteLine($"❌ User {id} not found");
            return NotFound("User niet gevonden");
        }
        
        // Get all manager IDs and manager objects
        var managerIdsList = GetUserManagerIds(user);
        var managers = await GetManagerUsers(managerIdsList);
        var managedUsers = user.ManagedUsers?.ToList() ?? new List<User>();
        
        Console.WriteLine($"📋 User {id} manager IDs: [{string.Join(", ", managerIdsList)}]");
        Console.WriteLine($"📋 Found {managers.Count} manager objects");
        
        var result = new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Address,
            user.HouseNumber,
            user.PostalCode,
            user.City,
            user.LoginName,
            user.Rank,
            user.Function,
            user.ManagerId,
            user.ManagerIds, // Raw string from database
            Manager = user.Manager != null ? new
            {
                user.Manager.Id,
                user.Manager.FirstName,
                user.Manager.LastName,
                FullName = $"{user.Manager.FirstName} {user.Manager.LastName}"
            } : null,
            // Return manager IDs in multiple formats for frontend compatibility
            AssignedManagerIds = managerIdsList, 
            AllManagerIds = managerIdsList, // Alternative name for clarity
            Managers = managers.Select(m => new
            {
                m.Id,
                m.FirstName,
                m.LastName,
                FullName = $"{m.FirstName} {m.LastName}",
                m.Function
            }).ToList(),
            ManagedUsers = managedUsers.Select(mu => new
            {
                mu.Id,
                mu.FirstName,
                mu.LastName,
                FullName = $"{mu.FirstName} {mu.LastName}"
            }).ToList(),
            FullName = $"{user.FirstName} {user.LastName}",
            IsAdmin = user.Rank == "admin",
            IsManager = user.Rank == "manager", 
            IsNormalUser = user.Rank == "user"
        };
        
        Console.WriteLine($"✅ User {id} data prepared successfully with {managerIdsList.Count} manager assignments");
        return Ok(result);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error fetching user {id}: {ex.Message}");
        return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de gebruiker");
    }
}
    /// <summary>
    /// Get all managers
    /// GET: /api/users/managers
    /// </summary>
    [HttpGet("managers")]
    public async Task<ActionResult<IEnumerable<object>>> GetManagers()
    {
        try
        {
            var managers = await _context.Users
                .Where(u => u.Rank == "manager")
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    FullName = $"{u.FirstName} {u.LastName}",
                    u.Function
                })
                .ToListAsync();

            return Ok(managers);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching managers: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van managers");
        }
    }

    /// <summary>
    /// Get users managed by specific manager
    /// GET: /api/users/manager/{managerId}/team
    /// </summary>
    [HttpGet("manager/{managerId}/team")]
    public async Task<ActionResult<IEnumerable<object>>> GetManagedUsersEndpoint(int managerId)
    {
        try
        {
            var managedUsers = await GetManagedUsers(managerId);

            var result = managedUsers
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    FullName = $"{u.FirstName} {u.LastName}",
                    u.Function,
                    u.Rank
                })
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching managed users: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het ophalen van teamleden");
        }
    }
[HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] UserLoginDto loginDto)
    {
        try
        {
            Console.WriteLine("== LOGIN POGING ==");
            Console.WriteLine($"UserInput ontvangen: '{loginDto.UserInput}'");

            if (string.IsNullOrWhiteSpace(loginDto.UserInput) || string.IsNullOrWhiteSpace(loginDto.Password))
            {
                return BadRequest("UserInput en Password zijn verplicht");
            }

            var input = loginDto.UserInput.Trim().ToLower();

            var user = await _context.Users
                .Include(u => u.Manager)
                .FirstOrDefaultAsync(u =>
                    u.Email.ToLower() == input || u.LoginName.ToLower() == input);

            if (user == null)
            {
                Console.WriteLine("❌ Geen gebruiker gevonden met deze loginnamen/email.");
                return Unauthorized("Ongeldige login");
            }

            Console.WriteLine($"✅ Gebruiker gevonden: {user.LoginName}");

            // SECURE PASSWORD VERIFICATION
            bool passwordValid = await _passwordService.VerifyPasswordAsync(loginDto.Password, user.Password);

            if (!passwordValid)
            {
                Console.WriteLine("❌ Wachtwoord komt niet overeen.");
                return Unauthorized("Ongeldig wachtwoord");
            }

            Console.WriteLine("✅ Login succesvol!");

            // Get manager information
            var managerIdsList = GetUserManagerIds(user);
            var managers = await GetManagerUsers(managerIdsList);
            
            // Generate JWT token
            var token = _jwtService.GenerateToken(user, managerIdsList);
            
            var result = new
            {
                // JWT Token
                token = token,
                tokenType = "Bearer",
                expiresIn = int.Parse(_configuration["Jwt:ExpireMinutes"]) * 60,
                
                // User information
                user = new
                {
                    user.Id,
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    user.Address,
                    user.HouseNumber,
                    user.PostalCode,
                    user.City,
                    user.LoginName,
                    user.Rank,
                    user.Function,
                    user.ManagerId,
                    user.ManagerIds,
                    Manager = user.Manager != null ? new
                    {
                        user.Manager.Id,
                        user.Manager.FirstName,
                        user.Manager.LastName,
                        FullName = $"{user.Manager.FirstName} {user.Manager.LastName}"
                    } : null,
                    AssignedManagerIds = managerIdsList,
                    AllManagerIds = managerIdsList,
                    Managers = managers.Select(m => new
                    {
                        m.Id,
                        m.FirstName,
                        m.LastName,
                        FullName = $"{m.FirstName} {m.LastName}"
                    }).ToList(),
                    FullName = $"{user.FirstName} {user.LastName}",
                    IsAdmin = user.Rank == "admin",
                    IsManager = user.Rank == "manager",
                    IsNormalUser = user.Rank == "user"
                }
            };
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Login error: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het inloggen");
        }
    }

   [HttpPost("register")]
    public async Task<ActionResult<User>> Register([FromBody] UserRegistrationDto dto)
    {
        try
        {
            Console.WriteLine("== REGISTRATIE POGING ==");
            Console.WriteLine($"Email: {dto.Email}, LoginName: {dto.LoginName}");

            // Validation
            if (string.IsNullOrWhiteSpace(dto.FirstName) || 
                string.IsNullOrWhiteSpace(dto.LastName) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.LoginName) ||
                string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest("Alle verplichte velden moeten ingevuld zijn");
            }

            // Password strength validation
            if (dto.Password.Length < 6)
            {
                return BadRequest("Wachtwoord moet minimaal 6 karakters lang zijn");
            }

            if (!IsValidEmail(dto.Email))
            {
                return BadRequest("Ongeldig e-mailadres format");
            }

            bool userExists = await _context.Users.AnyAsync(u =>
                u.Email.ToLower() == dto.Email.ToLower() || 
                u.LoginName.ToLower() == dto.LoginName.ToLower());

            if (userExists)
            {
                Console.WriteLine("❌ Gebruiker bestaat al");
                return BadRequest("Gebruiker met deze email of loginnaam bestaat al.");
            }

            var rank = dto.Rank ?? "user";
            if (!new[] { "user", "manager", "admin" }.Contains(rank))
            {
                return BadRequest("Ongeldig gebruikerstype. Toegestaan: user, manager, admin");
            }

            // Handle manager assignments (your existing logic)
            string managerIdsString = null;
            int? primaryManagerId = null;

            if (dto.CreatedByManagerId.HasValue)
            {
                var creatingManager = await _context.Users.FindAsync(dto.CreatedByManagerId.Value);
                if (creatingManager != null && creatingManager.Rank == "manager")
                {
                    primaryManagerId = dto.CreatedByManagerId.Value;
                    managerIdsString = dto.CreatedByManagerId.Value.ToString();
                }
            }

            if (dto.ManagerIds != null && dto.ManagerIds.Any())
            {
                if (dto.ManagerIds.Count > 10)
                {
                    return BadRequest("Maximum 10 managers toegestaan");
                }

                var validManagerIds = await _context.Users
                    .Where(u => dto.ManagerIds.Contains(u.Id) && u.Rank == "manager")
                    .Select(u => u.Id)
                    .ToListAsync();

                if (validManagerIds.Count != dto.ManagerIds.Count)
                {
                    return BadRequest("Een of meer opgegeven managers zijn ongeldig");
                }

                var allManagerIds = dto.ManagerIds.ToList();
                if (primaryManagerId.HasValue && !allManagerIds.Contains(primaryManagerId.Value))
                {
                    allManagerIds.Insert(0, primaryManagerId.Value);
                }

                managerIdsString = string.Join(",", allManagerIds.Distinct());
                
                if (!primaryManagerId.HasValue)
                {
                    primaryManagerId = dto.ManagerIds.First();
                }
            }

            if (dto.ManagerId.HasValue)
            {
                var manager = await _context.Users.FindAsync(dto.ManagerId.Value);
                if (manager == null || manager.Rank != "manager")
                {
                    return BadRequest("Ongeldige manager gespecificeerd");
                }
                
                primaryManagerId = dto.ManagerId.Value;
            }

            // HASH THE PASSWORD BEFORE SAVING
            Console.WriteLine("🔐 Hashing password...");
            var hashedPassword = await _passwordService.HashPasswordAsync(dto.Password);
            Console.WriteLine("✅ Password hashed successfully");

            // Create new user with hashed password
            var newUser = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.Trim().ToLower(),
                Address = dto.Address?.Trim() ?? "",
                HouseNumber = dto.HouseNumber?.Trim() ?? "",
                PostalCode = dto.PostalCode?.Trim() ?? "",
                City = dto.City?.Trim() ?? "",
                LoginName = dto.LoginName.Trim(),
                Password = hashedPassword, // STORE HASHED PASSWORD
                Rank = rank,
                Function = dto.Function?.Trim(),
                ManagerId = primaryManagerId,
                ManagerIds = managerIdsString
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            Console.WriteLine($"✅ Gebruiker aangemaakt met ID: {newUser.Id}");
            
            // Don't return the hashed password in response
            var responseUser = new
            {
                newUser.Id,
                newUser.FirstName,
                newUser.LastName,
                newUser.Email,
                newUser.LoginName,
                newUser.Rank,
                newUser.Function,
                newUser.ManagerId,
                newUser.ManagerIds,
                FullName = $"{newUser.FirstName} {newUser.LastName}"
            };
            
            return Ok(responseUser);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Registration error: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het aanmaken van de gebruiker");
        }
    }
// REGISTER ADMIN METHOD - With password hashing
    [HttpPost("register-admin")]
    public async Task<ActionResult<User>> RegisterAdmin([FromBody] UserRegistrationDto dto)
    {
        try
        {
            Console.WriteLine("== ADMIN REGISTRATIE POGING ==");
            Console.WriteLine($"Email: {dto.Email}, LoginName: {dto.LoginName}");

            // Basic validation
            if (string.IsNullOrWhiteSpace(dto.FirstName) ||
                string.IsNullOrWhiteSpace(dto.LastName) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.LoginName) ||
                string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest("Alle verplichte velden moeten ingevuld zijn");
            }

            // Password strength validation
            if (dto.Password.Length < 6)
            {
                return BadRequest("Wachtwoord moet minimaal 6 karakters lang zijn");
            }

            if (!IsValidEmail(dto.Email))
            {
                return BadRequest("Ongeldig e-mailadres format");
            }

            bool userExists = await _context.Users.AnyAsync(u =>
                u.Email.ToLower() == dto.Email.ToLower() ||
                u.LoginName.ToLower() == dto.LoginName.ToLower());

            if (userExists)
            {
                return BadRequest("Gebruiker met deze email of loginnaam bestaat al.");
            }

            // HASH THE PASSWORD
            Console.WriteLine("🔐 Hashing admin password...");
            var hashedPassword = await _passwordService.HashPasswordAsync(dto.Password);
            Console.WriteLine("✅ Admin password hashed successfully");

            var newUser = new User
            {
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email.Trim().ToLower(),
                Address = dto.Address?.Trim() ?? "",
                HouseNumber = dto.HouseNumber?.Trim() ?? "",
                PostalCode = dto.PostalCode?.Trim() ?? "",
                City = dto.City?.Trim() ?? "",
                LoginName = dto.LoginName.Trim(),
                Password = hashedPassword, // STORE HASHED PASSWORD
                Rank = "admin",
                Function = dto.Function?.Trim()
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            Console.WriteLine($"✅ Admin gebruiker aangemaakt met ID: {newUser.Id}");

            // Don't return the hashed password in response
            var responseUser = new
            {
                newUser.Id,
                newUser.FirstName,
                newUser.LastName,
                newUser.Email,
                newUser.LoginName,
                newUser.Rank,
                newUser.Function,
                FullName = $"{newUser.FirstName} {newUser.LastName}"
            };

            return Ok(responseUser);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Admin registration error: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het aanmaken van de admin gebruiker");
        }
    }
/// <summary>
/// Update user, it also include the hashing 
/// PUT: /api/users/{id}?requesterId={requesterId}
/// </summary>
[HttpPut("{id}")]
public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto dto, int? requesterId = null)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"📝 Updating user {id}" + (requesterId.HasValue ? $" by requester {requesterId}" : ""));
        Console.WriteLine($"DTO received: {System.Text.Json.JsonSerializer.Serialize(dto)}");

        // Check access permissions if requesterId is provided
        if (requesterId.HasValue)
        {
            var canAccess = await CanAccessUser(requesterId.Value, id);
            if (!canAccess)
            {
                Console.WriteLine($"❌ Access denied: User {requesterId} cannot update user {id}");
                return Forbid("Geen toegang om deze gebruiker te bewerken");
            }
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User niet gevonden");

        // Validation
        if (!string.IsNullOrWhiteSpace(dto.Email) && !IsValidEmail(dto.Email))
        {
            return BadRequest("Ongeldig e-mailadres format");
        }

        // Check for duplicate email or login name
        if (!string.IsNullOrWhiteSpace(dto.Email) || !string.IsNullOrWhiteSpace(dto.LoginName))
        {
            bool duplicateExists = await _context.Users.AnyAsync(u =>
                u.Id != id && 
                ((!string.IsNullOrWhiteSpace(dto.Email) && u.Email.ToLower() == dto.Email.ToLower()) ||
                 (!string.IsNullOrWhiteSpace(dto.LoginName) && u.LoginName.ToLower() == dto.LoginName.ToLower())));

            if (duplicateExists)
            {
                return BadRequest("Email of loginnaam is al in gebruik");
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.Rank))
        {
            if (!new[] { "user", "manager", "admin" }.Contains(dto.Rank))
            {
                return BadRequest("Ongeldig gebruikerstype. Toegestaan: user, manager, admin");
            }
        }

        // Update basic user fields
        if (!string.IsNullOrWhiteSpace(dto.FirstName)) user.FirstName = dto.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.LastName)) user.LastName = dto.LastName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim().ToLower();
        if (dto.Address != null) user.Address = dto.Address.Trim();
        if (dto.HouseNumber != null) user.HouseNumber = dto.HouseNumber.Trim();
        if (dto.PostalCode != null) user.PostalCode = dto.PostalCode.Trim();
        if (dto.City != null) user.City = dto.City.Trim();
        if (!string.IsNullOrWhiteSpace(dto.LoginName)) user.LoginName = dto.LoginName.Trim();
        if (dto.Function != null) user.Function = dto.Function.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Rank)) user.Rank = dto.Rank;

        // SECURE PASSWORD UPDATE - Hash new password if provided
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            Console.WriteLine("🔐 New password provided, validating and hashing...");
            
            // Password strength validation
            if (dto.Password.Length < 6)
            {
                return BadRequest("Wachtwoord moet minimaal 6 karakters lang zijn");
            }

            // Additional password complexity checks (optional but recommended)
            if (dto.Password.Length < 8)
            {
                Console.WriteLine("⚠️ Warning: Password is less than 8 characters");
            }

            try
            {
                // Hash the new password
                var hashedPassword = await _passwordService.HashPasswordAsync(dto.Password);
                user.Password = hashedPassword;
                Console.WriteLine("✅ New password hashed successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Password hashing failed: {ex.Message}");
                return StatusCode(500, "Er is een fout opgetreden bij het verwerken van het nieuwe wachtwoord");
            }
        }
        
        // FIXED: Handle multiple manager assignments properly
        if (dto.ManagerIds != null)
        {
            Console.WriteLine($"📋 Processing ManagerIds: [{string.Join(", ", dto.ManagerIds)}]");

            if (dto.ManagerIds.Count > 10)
            {
                return BadRequest("Maximum 10 managers toegestaan");
            }

            if (dto.ManagerIds.Contains(id))
            {
                return BadRequest("Een gebruiker kan niet zijn eigen manager zijn");
            }

            if (dto.ManagerIds.Any())
            {
                // Validate that all provided manager IDs exist and are actually managers
                var validManagerIds = await _context.Users
                    .Where(u => dto.ManagerIds.Contains(u.Id) && u.Rank == "manager")
                    .Select(u => u.Id)
                    .ToListAsync();

                if (validManagerIds.Count != dto.ManagerIds.Count)
                {
                    var invalidIds = dto.ManagerIds.Except(validManagerIds).ToList();
                    Console.WriteLine($"❌ Invalid manager IDs found: [{string.Join(", ", invalidIds)}]");
                    return BadRequest($"Een of meer opgegeven managers zijn ongeldig: {string.Join(", ", invalidIds)}");
                }

                // FIXED: Use the complete list of manager IDs sent from frontend
                // The frontend is already sending the complete list, so we use it as-is
                var sortedManagerIds = dto.ManagerIds.Distinct().OrderBy(x => x).ToList();
                user.ManagerIds = string.Join(",", sortedManagerIds);
                
                // Keep the first manager as primary for backward compatibility
                user.ManagerId = sortedManagerIds.First();
                
                Console.WriteLine($"✅ Set ManagerIds string: '{user.ManagerIds}'");
                Console.WriteLine($"✅ Set primary ManagerId: {user.ManagerId}");
                Console.WriteLine($"✅ Total managers assigned: {sortedManagerIds.Count}");
            }
            else
            {
                // Clear all manager assignments
                user.ManagerIds = null;
                user.ManagerId = null;
                Console.WriteLine($"✅ Cleared all manager assignments");
            }
        }
        // Handle legacy single manager assignment if ManagerIds is not provided
        else if (dto.ManagerId.HasValue)
        {
            if (dto.ManagerId.Value == id)
            {
                return BadRequest("Een gebruiker kan niet zijn eigen manager zijn");
            }

            var manager = await _context.Users.FindAsync(dto.ManagerId.Value);
            if (manager == null || manager.Rank != "manager")
            {
                return BadRequest("Ongeldige manager gespecificeerd");
            }

            user.ManagerId = dto.ManagerId.Value;
            user.ManagerIds = dto.ManagerId.Value.ToString();
            Console.WriteLine($"✅ Set legacy single manager: {dto.ManagerId.Value}");
        }
        else if (dto.ManagerId == 0)
        {
            // Clear manager assignment
            user.ManagerId = null;
            user.ManagerIds = null;
            Console.WriteLine($"✅ Cleared manager assignment");
        }

        // Mark entity as modified and save changes
        _context.Entry(user).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine($"✅ Gebruiker {id} succesvol bijgewerkt");
        
        // Return detailed response for debugging (excluding sensitive password info)
        return Ok(new { 
            message = "Gebruiker succesvol bijgewerkt",
            userId = id,
            updatedFields = new {
                basicInfo = !string.IsNullOrWhiteSpace(dto.FirstName) || !string.IsNullOrWhiteSpace(dto.LastName) || !string.IsNullOrWhiteSpace(dto.Email),
                passwordChanged = !string.IsNullOrWhiteSpace(dto.Password),
                managersUpdated = dto.ManagerIds?.Count ?? (dto.ManagerId.HasValue ? 1 : 0),
                rankChanged = !string.IsNullOrWhiteSpace(dto.Rank)
            },
            managerInfo = new {
                managerIdsString = user.ManagerIds,
                primaryManagerId = user.ManagerId,
                totalManagers = user.GetManagerIdsList()?.Count ?? 0
            }
        });
    }
    catch (DbUpdateConcurrencyException)
    {
        await transaction.RollbackAsync();
        if (!UserExists(id))
            return NotFound("User niet gevonden");
        else
            throw;
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        Console.WriteLine($"❌ Update error for user {id}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return StatusCode(500, $"Er is een fout opgetreden bij het bijwerken van de gebruiker: {ex.Message}");
    }
}

    /// <summary>
    /// Delete user - UPDATED with access control
    /// DELETE: /api/users/{id}?requesterId={requesterId}
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id, int? requesterId = null)
    {
        try
        {
            // Check access permissions if requesterId is provided
            if (requesterId.HasValue)
            {
                var canAccess = await CanAccessUser(requesterId.Value, id);
                if (!canAccess)
                {
                    Console.WriteLine($"❌ Access denied: User {requesterId} cannot delete user {id}");
                    return Forbid("Geen toegang om deze gebruiker te verwijderen");
                }
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User niet gevonden");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            Console.WriteLine($"✅ Gebruiker {id} verwijderd");
            return Ok("User verwijderd");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Delete error for user {id}: {ex.Message}");
            return StatusCode(500, "Er is een fout opgetreden bij het verwijderen van de gebruiker");
        }
    }

    private bool UserExists(int id)
    {
        return _context.Users.Any(e => e.Id == id);
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}

// Updated DTOs
public class UserLoginDto
{
    public string UserInput { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UserRegistrationDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string HouseNumber { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string LoginName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Function { get; set; }
    public string? Rank { get; set; } = "user";
    public int? ManagerId { get; set; } // Legacy single manager
    public List<int>? ManagerIds { get; set; } // Multiple managers
    public int? CreatedByManagerId { get; set; } // NEW: Track who created this user
}

public class UserUpdateDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? HouseNumber { get; set; }
    public string? PostalCode { get; set; }
    public string? City { get; set; }
    public string? LoginName { get; set; }
    public string? Password { get; set; }
    public string? Function { get; set; }
    public string? Rank { get; set; }
    public int? ManagerId { get; set; } // Legacy single manager
    public List<int>? ManagerIds { get; set; } // Multiple managers
}