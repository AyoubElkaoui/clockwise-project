using Npgsql;
using System.Data;

namespace ClockwiseProject.Backend.Data;

public class PostgreSQLConnectionFactory
{
    private readonly string _connectionString;

    public PostgreSQLConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("PostgreSQL")
            ?? throw new InvalidOperationException("PostgreSQL connection string not found");
    }

    public IDbConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }
}
