using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Voeg controllers toe met JSON-opties: 
// - Negeer referentielussen (cycles)
// - Gebruik camelCase voor property-namen
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// Voeg CORS-policy toe
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policyBuilder =>
        policyBuilder
            .AllowAnyMethod()
            .AllowAnyHeader()
            .WithOrigins("https://jouw-frontend-naam.vercel.app") // Voeg je Vercel URL toe
            .AllowCredentials());
});

// Voeg de database context toe (zorg dat je de juiste connection string gebruikt in je configuratie)
builder.Services.AddDbContext<ClockwiseDbContext>(options =>
    options.UseFirebird(builder.Configuration.GetConnectionString("DefaultConnection"))
);

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthorization();
app.MapControllers();

// Als er een "seed" argument is, voer dan de seed-code uit en stop daarna de applicatie
if (args.Length > 0 && args[0].ToLower() == "seed")
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var context = services.GetRequiredService<ClockwiseDbContext>();

        try
        {
            // Voer de migraties uit
            context.Database.Migrate();
            // Voer de seed-code uit
            SeedData.Initialize(context);
            Console.WriteLine("Database succesvol geseed.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEED ERROR] {ex.Message}");
        }
    }
    // Stop de applicatie na seeding
    return;
}

app.Run();