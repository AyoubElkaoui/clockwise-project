using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/users")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly ClockwiseDbContext _context;

    public UsersController(ClockwiseDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return await _context.Users.ToListAsync();
    }

    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] UserLoginDto loginDto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

        if (user == null) return Unauthorized("Ongeldige login");

        // Simpele check (je kunt hier JWT-authenticatie toevoegen)
        return Ok("Login succesvol");
    }
}

public class UserLoginDto
{
    public string Email { get; set; }
}