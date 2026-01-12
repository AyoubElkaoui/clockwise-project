using Npgsql;

var connString = "Host=aws-1-eu-west-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.ynajasnxfvgtlbjatlbw;Password=ZfQW69kqUPPLqKz5;SSL Mode=Require;Trust Server Certificate=true";

await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

// Check users
Console.WriteLine("=== USERS ===");
await using (var cmd = new NpgsqlCommand("SELECT id, username, role, medew_gc_id, first_name, last_name FROM users ORDER BY role, id", conn))
await using (var reader = await cmd.ExecuteReaderAsync())
{
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"ID: {reader.GetInt32(0)}, Username: {reader.GetString(1)}, Role: {reader.GetString(2)}, MedewGcId: {reader.GetInt32(3)}, Name: {reader.GetValue(4)} {reader.GetValue(5)}");
    }
}

// Check manager_assignments
Console.WriteLine("\n=== MANAGER ASSIGNMENTS ===");
await using (var cmd = new NpgsqlCommand("SELECT COUNT(*) FROM manager_assignments", conn))
{
    var count = (long?)await cmd.ExecuteScalarAsync();
    Console.WriteLine($"Total assignments: {count}");
}

await using (var cmd = new NpgsqlCommand(@"
    SELECT 
        m.username as manager,
        u.username as employee,
        ma.active_from,
        ma.active_until
    FROM manager_assignments ma
    JOIN users m ON ma.manager_id = m.id
    JOIN users u ON ma.employee_id = u.id
    LIMIT 10", conn))
await using (var reader = await cmd.ExecuteReaderAsync())
{
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"  {reader.GetString(0)} manages {reader.GetString(1)} (from {reader.GetDateTime(2)})");
    }
}

Console.WriteLine("\nDone!");
