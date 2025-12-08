using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Security.Cryptography.X509Certificates;

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

    // HTTP on 8080 (for backward compatibility)
    serverOptions.ListenAnyIP(8080);

    // HTTPS on 443
    serverOptions.ListenAnyIP(443, listenOptions =>
    {
        listenOptions.UseHttps("C:\\_Install\\clockwise-project\\backend\\cert.pfx", "YourSecurePassword123!");
    });
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
    options.EnableForHttps = true;
});

// ===== Response caching =====
builder.Services.AddResponseCaching();

// ===== Memory cache voor frequently accessed data =====
builder.Services.AddMemoryCache();

// ===== DB context met connection pooling =====
// Pakt connection string uit appsettings.json of env var "DefaultConnection"
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DefaultConnection");

// Ensure connection pooling is enabled
if (!connectionString.Contains("Pooling", StringComparison.OrdinalIgnoreCase))
{
    connectionString += ";Pooling=true;MinPoolSize=5;MaxPoolSize=100;ConnectionLifetime=300";
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
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
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
