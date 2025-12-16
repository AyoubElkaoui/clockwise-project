using Microsoft.EntityFrameworkCore;
using ClockwiseProject.Domain;

namespace ClockwiseProject.Backend
{
    public class PostgresDbContext : DbContext
    {
        public PostgresDbContext(DbContextOptions<PostgresDbContext> options) : base(options) { }

        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectGroup> ProjectGroups { get; set; }
        public DbSet<WorkTask> Tasks { get; set; }
        public DbSet<Timesheet> Timesheets { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<VacationRequest> VacationRequests { get; set; }
        public DbSet<IdempotencyRequest> IdempotencyRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<IdempotencyRequest>()
                .HasIndex(ir => new { ir.MedewGcId, ir.ClientRequestId })
                .IsUnique();
        }
    }
}
