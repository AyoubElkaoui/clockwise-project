using Dapper;
using ClockwiseProject.Backend.Repositories;
using ClockwiseProject.Domain;
using FirebirdSql.Data.FirebirdClient;

namespace ClockwiseProject.Backend.Repositories
{
    public class FirebirdUserRepository : IUserRepository
    {
        private readonly FirebirdConnectionFactory _connectionFactory;
        private readonly ClockwiseProject.Backend.Models.SyntessOptions _syntess;

        public FirebirdUserRepository(FirebirdConnectionFactory connectionFactory, ClockwiseProject.Backend.Models.SyntessOptions syntess)
        {
            _connectionFactory = connectionFactory;
            _syntess = syntess;
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS Id, '' AS FirstName, '' AS LastName, '' AS Email, '' AS Address, '' AS HouseNumber, '' AS PostalCode, '' AS City, '' AS LoginName, '' AS Password, '' AS Rank FROM AT_MEDEW";
            return await connection.QueryAsync<User>(sql);
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS Id, '' AS FirstName, '' AS LastName, '' AS Email, '' AS Address, '' AS HouseNumber, '' AS PostalCode, '' AS City, '' AS LoginName, '' AS Password, '' AS Rank FROM AT_MEDEW WHERE GC_ID = @Id";
            var user = await connection.QueryFirstOrDefaultAsync<User>(sql, new { Id = id });
            if (user != null)
            {
                // Set rank based on user ID
                user.Rank = _syntess.ManagerMedewGcIds.Contains(id) ? "manager" : "user";
            }
            return user;
        }

        public async Task<User?> GetByLoginNameAsync(string loginName)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS Id, '' AS FirstName, '' AS LastName, '' AS Email, '' AS Address, '' AS HouseNumber, '' AS PostalCode, '' AS City, '' AS LoginName, '' AS Password, '' AS Rank FROM AT_MEDEW WHERE GC_ID = @LoginName";
            var user = await connection.QueryFirstOrDefaultAsync<User>(sql, new { LoginName = loginName });
            if (user != null)
            {
                // Set rank based on user ID
                user.Rank = _syntess.ManagerMedewGcIds.Contains(user.Id) ? "manager" : "user";
            }
            return user;
        }

        public Task AddAsync(User user) => throw new NotImplementedException();

        public Task UpdateAsync(User user) => throw new NotImplementedException();

        public Task DeleteAsync(int id) => throw new NotImplementedException();
    }
}