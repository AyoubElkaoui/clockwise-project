using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Voeg controllers toe met JSON-opties die cycli negeren:
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Voeg CORS-policy toe
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Voeg de database context toe
builder.Services.AddDbContext<ClockwiseDbContext>(options =>
    options.UseFirebird(builder.Configuration.GetConnectionString("DefaultConnection"))
);

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthorization();
app.MapControllers();

// Database seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ClockwiseDbContext>();

    try
    {
        context.Database.Migrate();
        SeedData.Initialize(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR] {ex.Message}");
    }
}

app.Run();