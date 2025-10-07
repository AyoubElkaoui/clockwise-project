using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// CORS – tijdens proxy via Vercel kun je dit desnoods ruim zetten
builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin()
         .AllowAnyHeader()
         .AllowAnyMethod());
    // Als je rechtstreeks naar Koyeb belt i.p.v. via proxy:
    // o.AddPolicy("FrontendOnly", p =>
    //     p.WithOrigins("http://localhost:3000", "https://<jouw-vercel>.vercel.app")
    //      .AllowAnyHeader().AllowAnyMethod());
});

// DB context
builder.Services.AddDbContext<ClockwiseDbContext>(opts =>
    opts.UseFirebird(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? Environment.GetEnvironmentVariable("DefaultConnection"))
);

var app = builder.Build();

// ---- Middleware volgorde ----
app.UseRouting();
app.UseCors("AllowAll"); // of "FrontendOnly" als je strenger wilt
app.UseAuthorization();

// Endpoints
app.MapControllers();

// 💚 Health endpoint voor Koyeb
// 💚 Health + Root checks
app.MapGet("/", () => Results.Text("ok"));
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));


// Optionele seeding (blijft zoals je had)
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
    return; // stopt de app na seeding
}

app.Run();
