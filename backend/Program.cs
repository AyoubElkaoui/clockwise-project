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
builder.Services.AddDbContext<ClockwiseDbContext>(opts =>
    opts.UseFirebird(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? Environment.GetEnvironmentVariable("DefaultConnection"))
);

// ===== CORS =====
// In productie willen we Vercel (prod + preview) en evt. extra origins uit env toestaan.
// In development staat localhost:3000 aan.
const string CorsPolicyName = "AppCors";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        // Basis-origins
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://clockwise-project.vercel.app" // <-- jouw prod Vercel domein
        };

        // Extra origins via env (komma-gescheiden), bijv:
        // CORS_ORIGINS="https://my-preview.vercel.app,https://andere-site.nl"
        var extra = Environment.GetEnvironmentVariable("CORS_ORIGINS");
        if (!string.IsNullOrWhiteSpace(extra))
        {
            foreach (var origin in extra.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                allowed.Add(origin);
        }

        // Toestaan:
        policy
            // Sta specifieke origins toe...
            .WithOrigins(allowed.ToArray())
            // ...en daarnaast ALLE subdomeinen van vercel.app (previews)
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
            // .AllowCredentials(); // alleen aanzetten als je cookies/credentials gebruikt
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

// Optionele seeding
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
    return;
}

app.Run();
