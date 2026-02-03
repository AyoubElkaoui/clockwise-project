using ClockwiseProject.Backend.Controllers;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend;
using FirebirdSql.Data.FirebirdClient;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Configure URLs
builder.WebHost.UseUrls("http://localhost:5000");

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

// Configure Firebird connection
var firebirdConnectionString = builder.Configuration.GetConnectionString("Firebird") ?? "Database=C:\\Users\\Ayoub\\Desktop\\clockwise-project\\database\\atrium_mvp.fdb;User=SYSDBA;Password=masterkey;Dialect=3;Charset=UTF8;ServerType=0;Server=localhost;Port=3050;ClientLibrary=fbclient.dll;Pooling=true;MinPoolSize=5;MaxPoolSize=100;ConnectionLifetime=300";
builder.Services.AddSingleton(new FirebirdConnectionFactory(firebirdConnectionString));

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
builder.Services.AddScoped<ITimesheetRepository, FirebirdTimesheetRepository>();
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
builder.Services.AddScoped<TimesheetService>();
builder.Services.AddScoped<VacationService>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<backend.Services.TaskService>();
builder.Services.AddScoped<backend.Services.LeaveService>();
builder.Services.AddScoped<backend.Services.WorkflowService>();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment())
{
    // Middleware volgorde: belangrijk voor CORS
    app.UseRouting();
    app.UseCors("AllowSpecificOrigins");

    // Global exception handler that returns JSON for API routes
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            var problemDetails = new ProblemDetails
            {
                Status = 500,
                Title = "An error occurred",
                Detail = exception?.Message ?? "Internal server error",
                Instance = context.Request.Path
            };

            // Always return JSON for API routes
            if (context.Request.Path.Value?.StartsWith("/api") == true)
            {
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(problemDetails);
            }
            else
            {
                // For non-API routes, return HTML
                context.Response.ContentType = "text/html";
                context.Response.StatusCode = 500;
                await context.Response.WriteAsync($"<html><body><h1>Error</h1><p>{problemDetails.Detail}</p></body></html>");
            }
        });
    });
}

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

app.Run();

// Middleware class
public class MedewGcIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MedewGcIdMiddleware> _logger;

    public MedewGcIdMiddleware(RequestDelegate next, ILogger<MedewGcIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for OPTIONS requests (CORS preflight)
        if (context.Request.Method == "OPTIONS")
        {
            await _next(context);
            return;
        }

        // Skip authentication for login and auth endpoints
        var path = context.Request.Path.Value?.ToLower();
        if (path != null &&
            (path.Contains("/api/users/login") ||
             path.Contains("/api/auth/login") ||
             path.Contains("/api/auth/hash-password")) &&
            context.Request.Method == "POST")
        {
            await _next(context);
            return;
        }

        // Skip authentication for GET requests to public endpoints
        if (context.Request.Method == "GET" && path != null &&
            (path.Contains("/api/holidays") ||
             path.Contains("/api/periods") ||
             path.Contains("/api/health")))
        {
            await _next(context);
            return;
        }

        // Skip X-MEDEW-GC-ID for holidays management (uses X-User-ID instead)
        if (path != null && path.Contains("/api/holidays"))
        {
            await _next(context);
            return;
        }

        // Skip X-MEDEW-GC-ID for user-projects management
        if (path != null && path.Contains("/api/user-projects"))
        {
            await _next(context);
            return;
        }

        // Skip X-MEDEW-GC-ID for vacation management (uses X-User-ID instead)
        if (path != null && path.Contains("/api/vacation"))
        {
            await _next(context);
            return;
        }

        // Skip X-MEDEW-GC-ID for notifications (uses X-USER-ID instead)
        if (path != null && (path.Contains("/api/notifications") || path.Contains("/notifications")))
        {
            _logger.LogInformation("MedewGcIdMiddleware: SKIPPING auth for notifications - checking X-USER-ID");
            
            // Log all headers for debugging
            foreach (var header in context.Request.Headers)
            {
                _logger.LogInformation("  Header: {Key} = {Value}", header.Key, header.Value.ToString());
            }
            
            // Check for X-USER-ID header and store userId
            if (context.Request.Headers.TryGetValue("X-USER-ID", out var userIdHeader) &&
                int.TryParse(userIdHeader, out var userId))
            {
                _logger.LogInformation("MedewGcIdMiddleware: Found X-USER-ID={UserId}, storing in HttpContext.Items", userId);
                context.Items["UserId"] = userId;
            }
            else
            {
                _logger.LogWarning("MedewGcIdMiddleware: X-USER-ID header missing or invalid");
            }
            
            await _next(context);
            return;
        }

        _logger.LogInformation("MedewGcIdMiddleware: Processing {Method} {Path}", context.Request.Method, context.Request.Path);
        _logger.LogInformation("MedewGcIdMiddleware: Headers: {Headers}", string.Join(", ", context.Request.Headers.Keys));

        if (!context.Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var medewGcIdHeader) ||
            !int.TryParse(medewGcIdHeader, out var medewGcId))
        {
            _logger.LogWarning("MedewGcIdMiddleware: Missing or invalid X-MEDEW-GC-ID header");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid X-MEDEW-GC-ID header" });
            return;
        }

        _logger.LogInformation("MedewGcIdMiddleware: Found MedewGcId={MedewGcId}", medewGcId);

        // Store in HttpContext for later use
        context.Items["MedewGcId"] = medewGcId;
        await _next(context);
    }
}
