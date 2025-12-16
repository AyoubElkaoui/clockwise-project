using ClockwiseProject.Backend.Controllers;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Backend.Services;
using ClockwiseProject.Backend;
using FirebirdSql.Data.FirebirdClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Firebird connection
var firebirdConnectionString = builder.Configuration.GetConnectionString("Firebird");
builder.Services.AddSingleton(new FirebirdConnectionFactory(firebirdConnectionString));

// Configure Postgres (if needed for users)
var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
builder.Services.AddDbContext<PostgresDbContext>(options =>
    options.UseNpgsql(postgresConnectionString));

// Register repositories
builder.Services.AddScoped<ITimesheetRepository, FirebirdTimesheetRepository>();
// builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
// builder.Services.AddScoped<IVacationRepository, PostgresVacationRepository>();
builder.Services.AddScoped<IFirebirdDataRepository, FirebirdDataRepository>();

// Register services
// builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TimesheetService>();
// builder.Services.AddScoped<VacationService>();
builder.Services.AddScoped<TimeEntryService>();
builder.Services.AddScoped<ActivityService>();

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add middleware for X-MEDEW-GC-ID


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Add custom middleware
app.UseMiddleware<MedewGcIdMiddleware>();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

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
