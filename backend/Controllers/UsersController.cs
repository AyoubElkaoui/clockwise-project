using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

[Route("api/users")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public UsersController(ClockwiseDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Haal alle users op (manager/admin-doeleinden)
    /// GET: /api/users
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return await _context.Users.ToListAsync();
    }

    /// <summary>
    /// Haal één user op op basis van ID
    /// GET: /api/users/{id}
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User niet gevonden");
        return Ok(user);
    }

    /// <summary>
    /// Inloggen: gebruiker vult email of loginName in als 'UserInput' + password
    /// POST: /api/users/login
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<User>> Login([FromBody] UserLoginDto loginDto)
    {
        // Zoek op Email of LoginName
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email == loginDto.UserInput || u.LoginName == loginDto.UserInput);

        if (user == null)
            return Unauthorized("Ongeldige login");

        // Voor demo: vergelijken van plaintext wachtwoord (in productie: gebruik hashing)
        if (user.Password != loginDto.Password)
            return Unauthorized("Ongeldig wachtwoord");

        // Geef de user terug inclusief alle gegevens
        return Ok(user);
    }

    /// <summary>
    /// Registreren van nieuwe gebruikers
    /// POST: /api/users/register
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<User>> Register([FromBody] UserRegistrationDto dto)
    {
        // Check of er al een user bestaat met deze email of loginName
        bool userExists = await _context.Users.AnyAsync(u =>
            u.Email == dto.Email || u.LoginName == dto.LoginName);

        if (userExists)
        {
            return BadRequest("Gebruiker met deze email of loginnaam bestaat al.");
        }

        // Maak een nieuw User-object
        var newUser = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Address = dto.Address,
            HouseNumber = dto.HouseNumber,
            PostalCode = dto.PostalCode,
            City = dto.City,
            LoginName = dto.LoginName,
            Password = dto.Password, // In productie: gebruik hashing
            Rank = "user"            // Nieuwe gebruikers standaard "user"
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return Ok(newUser);
    }

    /// <summary>
    /// Updaten van een bestaande user (gebruikersnaam, email, adres, etc.)
    /// PUT: /api/users/{id}
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User niet gevonden");

        // Pas alleen de velden aan die de gebruiker mag wijzigen
        user.FirstName   = dto.FirstName;
        user.LastName    = dto.LastName;
        user.Email       = dto.Email;
        user.Address     = dto.Address;
        user.HouseNumber = dto.HouseNumber;
        user.PostalCode  = dto.PostalCode;
        user.City        = dto.City;
        user.LoginName   = dto.LoginName;
        user.Password    = dto.Password; // In productie gehashte password
        // user.Rank laten we meestal ongemoeid, tenzij admin

        try
        {
            _context.Entry(user).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!UserExists(id))
                return NotFound("User niet gevonden");
            else
                throw;
        }

        return Ok("Gebruiker succesvol bijgewerkt");
    }

    /// <summary>
    /// Verwijder een user (alleen admin/manager?), optioneel
    /// DELETE: /api/users/{id}
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User niet gevonden");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok("User verwijderd");
    }

    private bool UserExists(int id)
    {
        return _context.Users.Any(e => e.Id == id);
    }
}

// DTO's

public class UserLoginDto
{
    public string UserInput { get; set; }  // email of loginName
    public string Password { get; set; }
}

public class UserRegistrationDto
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public string HouseNumber { get; set; }
    public string PostalCode { get; set; }
    public string City { get; set; }
    public string LoginName { get; set; }
    public string Password { get; set; }
}

public class UserUpdateDto
{
    // Zelfde velden als RegistrationDto, maar evt. niet allemaal verplicht
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public string HouseNumber { get; set; }
    public string PostalCode { get; set; }
    public string City { get; set; }
    public string LoginName { get; set; }
    public string Password { get; set; }
}
