using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ===== Controllers + JSON =====
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// ===== DB context =====
// Pakt connection string uit appsettings.json of env var "DefaultConnection"
builder.Services.AddDbContext<ClockwiseDbContext>(opts =>
    opts.UseFirebird(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? Environment.GetEnvironmentVariable("DefaultConnection"))
);

// ===== CORS =====
const string CorsPolicyName = "AppCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://clockwise-project.vercel.app"
        };

        var extra = Environment.GetEnvironmentVariable("CORS_ORIGINS");
        if (!string.IsNullOrWhiteSpace(extra))
        {
            foreach (var origin in extra.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                allowed.Add(origin);
        }

        policy
            .WithOrigins(allowed.ToArray())
            .SetIsOriginAllowed(origin =>
            {
                try
                {
                    var host = new Uri(origin).Host;
                    return host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)
                           || allowed.Contains(origin);
                }
                catch { return false; }
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
            // .AllowCredentials(); // alleen als je cookies/credentials gebruikt
    });
});

var app = builder.Build();

// ===== Middleware volgorde =====
app.UseRouting();
app.UseCors(CorsPolicyName);
app.UseAuthorization();

// ===== Endpoints =====
app.MapControllers();

// Health + root
app.MapGet("/", () => Results.Text("ok"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// ===== Seeding opties =====

// 1) CLI mode: `dotnet backend.dll seed` -> seed en stop
if (args.Length > 0 && args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ClockwiseDbContext>();
    try
    {
        context.Database.Migrate();
        SeedData.Initialize(context);
        Console.WriteLine("Database succesvol geseed (CLI).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR - CLI] {ex.Message}");
    }
    return;
}

// 2) Startup seed via env var (SEED_ON_START=true): seed en ga door met draaien
var seedOnStart = Environment.GetEnvironmentVariable("SEED_ON_START");
if (!string.IsNullOrWhiteSpace(seedOnStart) &&
    seedOnStart.Equals("true", StringComparison.OrdinalIgnoreCase))
{
    try
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ClockwiseDbContext>();

        // Migrate + Seed (zorg dat jouw SeedData.Initialize idempotent is)
        context.Database.Migrate();
        SeedData.Initialize(context);
        Console.WriteLine("Database succesvol geseed (startup).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR - STARTUP] {ex.Message}");
    }
}

app.Run();
