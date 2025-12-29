using Microsoft.EntityFrameworkCore;
using ClockwiseProject.Domain;
using backend.Models;

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
        public DbSet<TimeEntryWorkflow> TimeEntriesWorkflow { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<IdempotencyRequest>()
                .HasIndex(ir => new { ir.MedewGcId, ir.ClientRequestId })
                .IsUnique();

            // Configure workflow table
            modelBuilder.Entity<TimeEntryWorkflow>(entity =>
            {
                entity.ToTable("time_entries_workflow");

                // Partial unique index for DRAFT/SUBMITTED entries
                entity.HasIndex(e => new { e.MedewGcId, e.Datum, e.TaakGcId, e.WerkGcId, e.UrenperGcId })
                    .HasFilter("status IN ('DRAFT', 'SUBMITTED')")
                    .IsUnique();
            });
        }
    }
}
