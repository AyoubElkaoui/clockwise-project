using ClockwiseProject.Backend.Controllers;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend;
using FirebirdSql.Data.FirebirdClient;
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

// Configure Firebird connection
var firebirdConnectionString = builder.Configuration["FIREBIRD_CONNECTION"];
builder.Services.AddSingleton(new FirebirdConnectionFactory(firebirdConnectionString));

// Configure Postgres (if needed for users)
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
builder.Services.AddDbContext<PostgresDbContext>(options =>
    options.UseNpgsql(postgresConnectionString));

// Register repositories
builder.Services.AddScoped<ITimesheetRepository, FirebirdTimesheetRepository>();
builder.Services.AddScoped<IUserRepository, FirebirdUserRepository>();
builder.Services.AddSingleton<IVacationRepository, InMemoryVacationRepository>();
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
}

// Add dummy holidays endpoint before middleware so it doesn't require auth
app.MapGet("/api/holidays/closed", (int? year) => Results.Ok(new string[0]));

app.UseMiddleware<MedewGcIdMiddleware>();

app.MapControllers();



// Add route for /api/projects/group/{groupId} to match frontend
app.MapGet("/api/projects/group/{groupId}", async (string groupId, IFirebirdDataRepository repository) =>
{
    try
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
    }
    catch (Exception ex)
    {
        return Results.Problem("Error fetching projects");
    }
});

// Add route for /api/project-groups
app.MapGet("/api/project-groups", async (IFirebirdDataRepository repository) =>
{
    try
    {
        var groups = await repository.GetProjectGroupsAsync();
        return Results.Ok(groups);
    }
    catch (Exception ex)
    {
        return Results.Problem("Error fetching project groups");
    }
});

app.Run();

// Middleware class
public class MedewGcIdMiddleware
{
    private readonly RequestDelegate _next;

    public MedewGcIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip authentication for OPTIONS requests (CORS preflight)
        if (context.Request.Method == "OPTIONS")
        {
            await _next(context);
            return;
        }

        // Skip authentication for holidays endpoint
        if (context.Request.Path.Value?.Contains("/api/holidays") == true)
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

        // Skip authentication for seed endpoint
        if (context.Request.Path.Value?.EndsWith("/api/users/seed") == true && context.Request.Method == "POST")
        {
            await _next(context);
            return;
        }

        // Skip authentication for vacation endpoints
        if (context.Request.Path.Value?.StartsWith("/api/vacation") == true)
        {
            await _next(context);
            return;
        }

        // Skip authentication for public endpoints
        if (context.Request.Path.Value?.StartsWith("/api/projects") == true ||
            context.Request.Path.Value?.StartsWith("/api/project-groups") == true ||
            context.Request.Path.Value?.StartsWith("/api/companies") == true ||
            context.Request.Path.Value?.StartsWith("/api/activities") == true)
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-MEDEW-GC-ID", out var medewGcIdHeader) ||
            !int.TryParse(medewGcIdHeader, out var medewGcId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        // Store in HttpContext for later use
        context.Items["MedewGcId"] = medewGcId;
        await _next(context);
    }
}
