using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Security.Cryptography.X509Certificates;
using System.IO;
using backend.Data;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

// ===== Performance optimizations =====
// Configure Kestrel for production with connection limits
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxConcurrentConnections = 200;
    serverOptions.Limits.MaxConcurrentUpgradedConnections = 200;
    serverOptions.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10MB
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);

    // Render injecteert PORT; lokaal val je terug op 5000
    var portVar = Environment.GetEnvironmentVariable("PORT");
    var port = int.TryParse(portVar, out var p) ? p : 5000;

    // Production: alleen HTTP op de juiste poort
    if (builder.Environment.IsProduction())
    {
        serverOptions.ListenAnyIP(port, listenOptions =>
        {
            listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
        });
        return;
    }

    // Dev/lokaal: HTTP op 5000 (zoals je docker-compose)
    serverOptions.ListenAnyIP(5000);

    // Optioneel: lokaal HTTPS als je echt wilt (en alleen als het bestand bestaat)
    // var certPath = Path.Combine(AppContext.BaseDirectory, "cert.pfx");
    // if (File.Exists(certPath))
    // {
    //     serverOptions.ListenAnyIP(5001, lo => lo.UseHttps(certPath, "password"));
    // }
});
// ===== Controllers + JSON =====
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// ===== Response compression =====
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = false;
});

// ===== Response caching =====
builder.Services.AddResponseCaching();

// ===== Memory cache voor frequently accessed data =====
builder.Services.AddMemoryCache();

// ===== DB context =====
// Pakt connection string uit env var "DefaultConnection" of appsettings.json
var connectionString = Environment.GetEnvironmentVariable("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Connection string not found. Please set DefaultConnection in appsettings.json or environment variables.");
}

builder.Services.AddDbContext<ClockwiseDbContext>(opts =>
    opts.UseFirebird(connectionString)
        .EnableSensitiveDataLogging(false) // Disable in production
        .EnableDetailedErrors(false) // Disable in production
);

// ===== CORS =====
const string CorsPolicyName = "AppCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy
            .WithOrigins("https://clockwise-project.vercel.app")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ===== Middleware volgorde (optimized for performance) =====
app.UseResponseCompression(); // Compress responses first
app.UseResponseCaching(); // Cache responses
app.UseRouting();
app.UseCors(CorsPolicyName);
app.UseAuthorization();

// ===== Endpoints =====
app.MapControllers();

// Health + root
app.MapGet("/", () => Results.Text("ok"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Manual seed endpoint
app.MapPost("/seed", () =>
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ClockwiseDbContext>();
    try
    {
        context.Database.Migrate();
        SeedData.Initialize(context);
        return Results.Ok("Database seeded successfully");
    }
    catch (Exception ex)
    {
        return Results.Problem($"Seeding failed: {ex.Message}");
    }
});

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
