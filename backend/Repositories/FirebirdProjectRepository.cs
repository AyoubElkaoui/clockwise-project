using Dapper;
using ClockwiseProject.Backend.Models;
using ClockwiseProject.Backend.Repositories;
using FirebirdSql.Data.FirebirdClient;

namespace ClockwiseProject.Backend.Repositories
{
    public class FirebirdProjectRepository : IAtriumProjectRepository
    {
        private readonly FirebirdConnectionFactory _connectionFactory;

        public FirebirdProjectRepository(FirebirdConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<ProjectGroup>> GetAllProjectGroupsAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode FROM AT_WERKGRP ORDER BY GC_CODE";
            return await connection.QueryAsync<ProjectGroup>(sql);
        }

        public async Task<IEnumerable<Project>> GetProjectsByGroupAsync(int groupId)
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = "SELECT GC_ID AS GcId, GC_CODE AS GcCode, WERKGRP_GC_ID AS WerkgrpGcId FROM AT_WERK WHERE WERKGRP_GC_ID = @GroupId ORDER BY GC_CODE";
            return await connection.QueryAsync<Project>(sql, new { GroupId = groupId });
        }

        // Other methods if needed, but for now, these are the main ones
    }
}
