using FirebirdSql.Data.FirebirdClient;
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
            "https://clockwise-project.vercel.app" // jouw Vercel prod
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
            // .AllowCredentials(); // aanzetten als je cookies/JWT via cookies gebruikt
    });
});

// ===== Firebird: connection string builder =====
string? envCs = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
string? cfgCs = builder.Configuration.GetConnectionString("DefaultConnection");
var baseCs = !string.IsNullOrWhiteSpace(envCs) ? envCs! : (cfgCs ?? "");

// Start vanuit wat je in appsettings/env hebt
var fb = string.IsNullOrWhiteSpace(baseCs)
    ? new FbConnectionStringBuilder()
    : new FbConnectionStringBuilder(baseCs);

// In production dwingen we embedded + lokaal bestand
if (builder.Environment.IsProduction() || Environment.GetEnvironmentVariable("FIREBIRD_EMBEDDED") == "1")
{
    fb.Database = "/app/CLOCKWISE.FDB";
    if (string.IsNullOrWhiteSpace(fb.UserID)) fb.UserID = "SYSDBA";
    if (string.IsNullOrWhiteSpace(fb.Password)) fb.Password = "masterkey";
    if (string.IsNullOrWhiteSpace(fb.Charset)) fb.Charset = "UTF8";
    if (fb.Dialect == 0) fb.Dialect = 3;

    fb.ServerType = FbServerType.Embedded;
    fb.DataSource = "";                 // expliciet geen host (dus geen netwerk)
    fb.Pooling = false;

    // Client lib pad van Debian/Ubuntu (dotnet aspnet:8.0 base)
    if (string.IsNullOrWhiteSpace(fb.ClientLibrary))
        fb.ClientLibrary = "/usr/lib/x86_64-linux-gnu/libfbclient.so.2";
}

// Log welke CS effectief gebruikt wordt (zonder wachtwoord)
var csToUse = fb.ToString();
var csLogSafe = csToUse
    .Replace("Password=masterkey", "Password=***", StringComparison.OrdinalIgnoreCase)
    .Replace("Password= Masterkey", "Password=***", StringComparison.OrdinalIgnoreCase);
builder.Logging.AddConsole();
builder.Services.AddDbContext<ClockwiseDbContext>(opts => opts.UseFirebird(csToUse));
Console.WriteLine("[DB] Using Firebird CS => " + csLogSafe);

// ===== App pipeline =====
var app = builder.Build();

app.UseRouting();
app.UseCors(CorsPolicyName);
app.UseAuthorization();

app.MapControllers();

// Health + root
app.MapGet("/", () => Results.Text("ok"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// ===== Optionele seeding =====
// Run: `dotnet backend.dll seed`
if (args.Length > 0 && args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ClockwiseDbContext>();
    try
    {
        context.Database.Migrate();
        SeedData.Initialize(context);
        Console.WriteLine("Database succesvol geseed.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR] {ex.Message}");
    }
    return; // stop na seeden
}

app.Run();
