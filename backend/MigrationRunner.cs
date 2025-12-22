using Npgsql;

namespace backend;

/// <summary>
/// Utility to run database migrations
/// Usage: dotnet run --project backend migrate
/// </summary>
public class MigrationRunner
{
    public static async Task RunMigrationsAsync(string connectionString)
    {
        Console.WriteLine("Starting database migrations...");

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        var migrationSql = await File.ReadAllTextAsync("Migrations/001_CreateWorkflowTables.sql");

        await using var command = new NpgsqlCommand(migrationSql, connection);
        await command.ExecuteNonQueryAsync();

        Console.WriteLine("✓ Migration 001_CreateWorkflowTables completed successfully!");
        Console.WriteLine("\nYou can now use the workflow endpoints:");
        Console.WriteLine("  POST   /api/workflow/draft         - Save draft");
        Console.WriteLine("  GET    /api/workflow/drafts        - Get drafts");
        Console.WriteLine("  POST   /api/workflow/submit        - Submit for review");
        Console.WriteLine("  GET    /api/workflow/review/pending - Manager view");
        Console.WriteLine("  POST   /api/workflow/review        - Approve/reject");
    }

    public static async Task Main(string[] args)
    {
        if (args.Length > 0 && args[0] == "migrate")
        {
            var connectionString = "Host=db.ynajasnxfvgtlbjatlbw.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=Kj9QIapHHgKUlguF;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;";

            try
            {
                await RunMigrationsAsync(connectionString);
                Console.WriteLine("\n✓ All migrations completed successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n✗ Migration failed: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                Environment.Exit(1);
            }
        }
    }
}
