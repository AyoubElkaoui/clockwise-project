using System.Text;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using backend.Services;
using backend.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// JWT Authentication configuration
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

// Add authorization
builder.Services.AddAuthorization();

// REGISTER ALL SERVICES
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPasswordService, PasswordService>(); // NEW: Password service
builder.Services.AddScoped<IPasswordMigrationService, PasswordMigrationService>(); // NEW: Migration service

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policyBuilder =>
        policyBuilder
            .AllowAnyMethod()
            .AllowAnyHeader()
            .WithOrigins(
                "http://localhost:3000",
                "https://jouw-frontend-naam.vercel.app"
            )
            .AllowCredentials());
});

builder.Services.AddDbContext<ClockwiseDbContext>(options =>
    options.UseFirebird("User=SYSDBA;Password=masterkey;Database=localhost/3051:/firebird/data/clockwise.fdb;"));

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();

// Authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Handle seeding before database setup
if (args.Length > 0 && args[0].ToLower() == "seed")
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var context = services.GetRequiredService<ClockwiseDbContext>();

        try
        {
            Console.WriteLine("🌱 Starting database seeding...");
            
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("✅ Database ready for seeding");
            
            SeedData.Initialize(context);
            Console.WriteLine("✅ Database seeded successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ [SEED ERROR] {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }
    }
    return;
}

// Database migrations
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ClockwiseDbContext>();
    try
    {
        Console.WriteLine("🔄 Applying database migrations...");
        await context.Database.MigrateAsync();
        Console.WriteLine("✅ Database migrations applied");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Migration failed: {ex.Message}");
    }
}
app.Run();