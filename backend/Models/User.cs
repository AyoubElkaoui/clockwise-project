public class User
{
    public int Id { get; set; }

    // Persoonlijke gegevens
    public required string FirstName { get; set; }       // Voornaam
    public required string LastName { get; set; }        // Achternaam
    public required string Email { get; set; }           // Email
    public required string Address { get; set; }         // Straatnaam
    public required string HouseNumber { get; set; }     // Huisnummer
    public required string PostalCode { get; set; }      // Postcode
    public required string City { get; set; }            // Plaats

    // Inloggegevens
    public required string LoginName { get; set; }       // Inlognaam
    public required string Password { get; set; }        // Wachtwoord (in productie: gehashed!)

    // Rol / Rank
    public required string Rank { get; set; }            // "user", "manager", "admin"
}