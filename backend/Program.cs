using ClockwiseProject.Backend.Controllers;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend;
using FirebirdSql.Data.FirebirdClient;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dapper;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Configure URLs: ASPNETCORE_URLS / config "Urls" win, otherwise fall back to localhost:5000
var configuredUrls = builder.Configuration["Urls"]
    ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (string.IsNullOrWhiteSpace(configuredUrls))
{
    builder.WebHost.UseUrls("http://localhost:5000");
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(
                "https://clockd.nl",
                "https://www.clockd.nl",
                "https://clockwise-project.vercel.app",
                "http://localhost:3000",
                "http://localhost:3001"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Alleen als je cookies/auth headers nodig hebt; anders weghalen
    });
});

// Add ProblemDetails service for exception handling
builder.Services.AddProblemDetails();

// Klantspecifieke Syntess Atrium-sleutels (sectie "Syntess" in appsettings / env Syntess__*)
var syntessOptions = ClockwiseProject.Backend.Models.SyntessOptions.FromConfiguration(builder.Configuration);
syntessOptions.Validate();
builder.Services.AddSingleton(syntessOptions);
builder.Services.Configure<ClockwiseProject.Backend.Models.SyntessOptions>(builder.Configuration.GetSection(ClockwiseProject.Backend.Models.SyntessOptions.SectionName));

// Configure Firebird connection (verplicht; geen ingebouwde fallback)
var firebirdConnectionString = builder.Configuration.GetConnectionString("Firebird");
if (string.IsNullOrWhiteSpace(firebirdConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:Firebird ontbreekt. Configureer deze in appsettings.json of via de omgevingsvariabele ConnectionStrings__Firebird.");
}
builder.Services.AddSingleton(new FirebirdConnectionFactory(firebirdConnectionString));
{
    // Startup diagnostics: show which Firebird target/user is actually in use (password never printed)
    var fbInfo = new FirebirdSql.Data.FirebirdClient.FbConnectionStringBuilder(firebirdConnectionString);
    var fbSource = Environment.GetEnvironmentVariable("ConnectionStrings__Firebird") != null ? "env ConnectionStrings__Firebird" : "appsettings";
    Console.WriteLine($"[startup] Firebird -> {fbInfo.DataSource}:{fbInfo.Port} db={fbInfo.Database} user={fbInfo.UserID} source={fbSource}");
}

// Configure PostgreSQL (Supabase) connection
builder.Services.AddSingleton<ClockwiseProject.Backend.Data.PostgreSQLConnectionFactory>();

// Register IDbConnection for Dapper (PostgreSQL)
builder.Services.AddScoped<System.Data.IDbConnection>(sp =>
{
    var factory = sp.GetRequiredService<ClockwiseProject.Backend.Data.PostgreSQLConnectionFactory>();
    return factory.CreateConnection();
});

// Configure Postgres EF Core DbContext (needed by some repositories)
// DISABLED: EF Core packages removed, using Dapper instead
// var postgresConnectionString = builder.Configuration.GetConnectionString("PostgreSQL");
// if (!string.IsNullOrEmpty(postgresConnectionString))
// {
//     // Use compatible version without migrations
//     builder.Services.AddDbContext<PostgresDbContext>(options =>
//     {
//         options.UseNpgsql(postgresConnectionString);
//     }, ServiceLifetime.Scoped);
// }

// Register repositories
builder.Services.AddScoped<IUserRepository, FirebirdUserRepository>();
builder.Services.AddSingleton<IVacationRepository, PostgresLeaveRepository>();
builder.Services.AddScoped<IFirebirdDataRepository, FirebirdDataRepository>();
builder.Services.AddScoped<backend.Repositories.ITaskRepository, backend.Repositories.FirebirdTaskRepository>();
builder.Services.AddScoped<backend.Repositories.ITimeEntryRepository, backend.Repositories.FirebirdTimeEntryRepository>();

// PostgreSQL repositories (Supabase)
builder.Services.AddScoped<backend.Repositories.PostgreSQLUserRepository>();
builder.Services.AddScoped<backend.Repositories.IWorkflowRepository, backend.Repositories.PostgresWorkflowRepository>();
builder.Services.AddScoped<backend.Repositories.INotificationRepository, backend.Repositories.NotificationRepository>();

// Dapper repositories
builder.Services.AddScoped<backend.Repositories.DapperTimeEntryRepository>();

// Register services
builder.Services.AddScoped<backend.Services.AuthenticationService>();
builder.Services.AddScoped<backend.Services.ITwoFactorService, backend.Services.TwoFactorService>();
builder.Services.AddScoped<VacationService>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<backend.Services.TaskService>();
builder.Services.AddScoped<backend.Services.LeaveService>();
builder.Services.AddScoped<backend.Services.WorkflowService>();

// Email reminder services
builder.Services.AddScoped<backend.Services.IEmailReminderService, backend.Services.EmailReminderService>();
builder.Services.AddHostedService<backend.Services.ReminderSchedulerService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware volgorde: belangrijk voor CORS - moet altijd actief zijn
app.UseRouting();
app.UseCors("AllowSpecificOrigins");

// Global exception handler: generic message + correlation id (details are only logged)
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var correlationId = Guid.NewGuid().ToString("N");
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exception, "Unhandled exception (correlationId={CorrelationId}) for {Method} {Path}",
            correlationId, context.Request.Method, context.Request.Path);

        context.Response.StatusCode = 500;
        if (context.Request.Path.Value?.StartsWith("/api", StringComparison.OrdinalIgnoreCase) == true)
        {
            context.Response.ContentType = "application/json";
            var problemDetails = new ProblemDetails
            {
                Status = 500,
                Title = "Er is een interne fout opgetreden",
                Detail = $"Neem contact op met de beheerder en vermeld referentie {correlationId}",
                Instance = context.Request.Path
            };
            problemDetails.Extensions["correlationId"] = correlationId;
            await context.Response.WriteAsJsonAsync(problemDetails);
        }
        else
        {
            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync($"<html><body><h1>Error</h1><p>Er is een interne fout opgetreden. Referentie: {correlationId}</p></body></html>");
        }
    });
});

// Add dummy holidays endpoint before middleware so it doesn't require auth
app.MapGet("/api/holidays/closed", (int? year) => Results.Ok(new string[0]));

app.UseMiddleware<MedewGcIdMiddleware>();

app.MapControllers();



// Add route for /api/projects/group/{groupId} to match frontend
app.MapGet("/api/projects/group/{groupId}", async (string groupId, IFirebirdDataRepository repository) =>
{
    if (int.TryParse(groupId, out var id))
    {
        var projects = await repository.GetProjectsByGroupAsync(id);
        return Results.Ok(projects);
    }
    else
    {
        var allProjects = await repository.GetAllProjectsAsync();
        return Results.Ok(allProjects);
    }
});

// One-time-safe generator alignment on startup: the app now allocates GC_ID via the Atrium
// generators (GEN_ID), but historical MAX+1 inserts may have left a generator BEHIND the
// table's MAX id. Bump each generator UP to at least MAX so GEN_ID never returns an existing
// id (which would collide on a payroll row). Bump-up-only + idempotent, so it is safe to run
// on every boot (it is a no-op once aligned). Never lowers a generator, so it cannot disturb
// Syntess if Syntess has already advanced it.
try
{
    var fbFactory = app.Services.GetRequiredService<FirebirdConnectionFactory>();
    var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
    using var alignConn = fbFactory.CreateConnection();
    await alignConn.OpenAsync();
    foreach (var (table, generator) in new[] { ("AT_URENBREG", "AG_URENBREG"), ("AT_DOCUMENT", "AG_DOCUMENT") })
    {
        // table/generator are fixed literals (no user input) - safe to interpolate.
        var maxId = await alignConn.ExecuteScalarAsync<long>($"SELECT COALESCE(MAX(GC_ID), 0) FROM {table}");
        var current = await alignConn.ExecuteScalarAsync<long>($"SELECT GEN_ID({generator}, 0) FROM RDB$DATABASE");
        if (maxId > current)
        {
            await alignConn.ExecuteScalarAsync<long>($"SELECT GEN_ID({generator}, {maxId - current}) FROM RDB$DATABASE");
            startupLogger.LogWarning("Generator {Generator} was behind ({Current}) - bumped up to table MAX ({Max})", generator, current, maxId);
        }
    }
}
catch (Exception ex)
{
    app.Services.GetRequiredService<ILogger<Program>>().LogError(ex, "Startup generator alignment failed - check Firebird connectivity");
}

app.Run();

// Middleware class
public class MedewGcIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MedewGcIdMiddleware> _logger;

    // A valid signed JWT is REQUIRED for every non-public request. There is no
    // header-trust fallback: X-MEDEW-GC-ID / X-USER-ID / X-USER-ROLE from the client are never used.
    private readonly TokenValidationParameters? _validationParameters;
    private readonly JwtSecurityTokenHandler _tokenHandler = new();

    public MedewGcIdMiddleware(RequestDelegate next, ILogger<MedewGcIdMiddleware> logger, IConfiguration configuration)
    {
        _next = next;
        _logger = logger;

        var jwtKey = configuration["Jwt:Key"];
        if (!string.IsNullOrEmpty(jwtKey))
        {
            _validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "clockwise-backend",
                ValidateAudience = true,
                ValidAudience = "clockwise-frontend",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };
        }
        else
        {
            _logger.LogError("Jwt:Key is not configured - all authenticated requests will be rejected");
        }
    }

    private ClaimsPrincipal? TryValidateToken(HttpContext context)
    {
        if (_validationParameters == null) return null;

        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = authHeader.Substring("Bearer ".Length).Trim();
        if (string.IsNullOrEmpty(token)) return null;

        try
        {
            return _tokenHandler.ValidateToken(token, _validationParameters, out _);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("JWT validation failed: {Message}", ex.Message);
            return null;
        }
    }

    // Store the VERIFIED claim values in HttpContext.Items and strip any client-supplied
    // identity headers so that nothing downstream can accidentally trust them.
    private static void ApplyVerifiedIdentity(HttpContext context, ClaimsPrincipal principal)
    {
        context.Request.Headers.Remove("X-MEDEW-GC-ID");
        context.Request.Headers.Remove("X-USER-ID");
        context.Request.Headers.Remove("X-USER-ROLE");

        var medew = principal.FindFirst("medew_gc_id")?.Value;
        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? principal.FindFirst("nameid")?.Value;
        var role = principal.FindFirst(ClaimTypes.Role)?.Value
                   ?? principal.FindFirst("role")?.Value;

        if (!string.IsNullOrEmpty(medew) && int.TryParse(medew, out var m))
            context.Items["MedewGcId"] = m;
        if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out var u))
            context.Items["UserId"] = u;
        if (!string.IsNullOrEmpty(role))
            context.Items["UserRole"] = role.Trim().ToLowerInvariant();
    }

    private static bool IsPublicPath(string? path, string method)
    {
        if (string.IsNullOrEmpty(path)) return false;

        if (method == "POST" && path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase))
            return true;

        if (method == "GET" &&
            (path.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase) ||
             path.StartsWith("/api/system-settings/require-2fa", StringComparison.OrdinalIgnoreCase) ||
             path.StartsWith("/api/holidays", StringComparison.OrdinalIgnoreCase)))
            return true;

        return false;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for OPTIONS requests (CORS preflight)
        if (context.Request.Method == "OPTIONS")
        {
            await _next(context);
            return;
        }

        var principal = TryValidateToken(context);
        if (principal != null)
        {
            ApplyVerifiedIdentity(context, principal);
            await _next(context);
            return;
        }

        if (IsPublicPath(context.Request.Path.Value, context.Request.Method))
        {
            await _next(context);
            return;
        }

        _logger.LogWarning("Rejected request without valid bearer token: {Method} {Path}",
            context.Request.Method, context.Request.Path);
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new { error = "Ontbrekend of ongeldig bearer token" });
    }
}
