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
var firebirdConnectionString = builder.Configuration["FIREBIRD_CONNECTION"] ?? "Database=C:\\Users\\Ayoub\\Desktop\\clockwise-project\\database\\atrium_mvp.fdb;User=SYSDBA;Password=masterkey;Dialect=3;Charset=UTF8;ServerType=0;Server=localhost;Port=3050;ClientLibrary=fbclient.dll;Pooling=true;MinPoolSize=5;MaxPoolSize=100;ConnectionLifetime=300";
builder.Services.AddSingleton(new FirebirdConnectionFactory(firebirdConnectionString));

// Configure Postgres (if needed for users)
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
builder.Services.AddDbContext<PostgresDbContext>(options =>
    options.UseNpgsql(postgresConnectionString));

// Register repositories
builder.Services.AddScoped<ITimesheetRepository, FirebirdTimesheetRepository>();
builder.Services.AddScoped<IUserRepository, FirebirdUserRepository>();
builder.Services.AddSingleton<IVacationRepository, FirebirdVacationRepository>();
builder.Services.AddScoped<IFirebirdDataRepository, FirebirdDataRepository>();

// Register services
// builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TimesheetService>();
builder.Services.AddScoped<VacationService>();
builder.Services.AddScoped<TimeEntryService>();
builder.Services.AddScoped<ActivityService>();


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

        // Skip authentication for login endpoint
        if (context.Request.Path.Value?.EndsWith("/api/users/login") == true && context.Request.Method == "POST")
        {
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
