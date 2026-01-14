using System.Collections.Generic;
using System.Threading.Tasks;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend.Repositories
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByLoginNameAsync(string loginName);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
    }
}
