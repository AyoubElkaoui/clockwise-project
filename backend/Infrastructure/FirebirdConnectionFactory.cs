using FirebirdSql.Data.FirebirdClient;

namespace ClockwiseProject.Backend
{
    public class FirebirdConnectionFactory
    {
        private readonly string _connectionString;

        public FirebirdConnectionFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        public FbConnection CreateConnection()
        {
            return new FbConnection(_connectionString);
        }
    }
}
