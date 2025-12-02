using Microsoft.EntityFrameworkCore;

public class ClockwiseDbContext : DbContext
{
    public ClockwiseDbContext(DbContextOptions<ClockwiseDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<ProjectGroup> ProjectGroups { get; set; }
    public DbSet<Activity> Activities { get; set; }
    public DbSet<UserProject> UserProjects { get; set; }
    public DbSet<VacationRequest> VacationRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --------- Relaties + delete gedrag ---------
        modelBuilder.Entity<ProjectGroup>()
            .HasOne(pg => pg.Company)
            .WithMany(c => c.ProjectGroups)
            .HasForeignKey(pg => pg.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.ProjectGroup)
            .WithMany(pg => pg.Projects)
            .HasForeignKey(p => p.ProjectGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.User)
            .WithMany()
            .HasForeignKey(te => te.UserId)
            .OnDelete(DeleteBehavior.Restrict); // voorkom massale deletes

        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.Project)
            .WithMany()
            .HasForeignKey(te => te.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<VacationRequest>()
            .HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Activity>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.User)
            .WithMany()
            .HasForeignKey(up => up.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.Project)
            .WithMany()
            .HasForeignKey(up => up.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.AssignedByUser)
            .WithMany()
            .HasForeignKey(up => up.AssignedByUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict); // belangrijk: geen cascade-loop via User

        // Manager-Employee relationship (self-referencing)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Manager)
            .WithMany(u => u.ManagedEmployees)
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete of employees when manager is deleted

        // --------- Unieke indexen (idempotent seeden / datakwaliteit) ---------
        modelBuilder.Entity<Company>()
            .HasIndex(c => c.Name)
            .IsUnique();

        modelBuilder.Entity<ProjectGroup>()
            .HasIndex(pg => new { pg.CompanyId, pg.Name })
            .IsUnique();

        modelBuilder.Entity<Project>()
            .HasIndex(p => new { p.ProjectGroupId, p.Name })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.LoginName)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<UserProject>()
            .HasIndex(up => new { up.UserId, up.ProjectId })
            .IsUnique();

        // --------- Handige niet-unieke indexen (performance) ---------
        modelBuilder.Entity<TimeEntry>()
            .HasIndex(te => new { te.UserId, te.StartTime });

        modelBuilder.Entity<VacationRequest>()
            .HasIndex(v => new { v.UserId, v.StartDate, v.EndDate });

        modelBuilder.Entity<Activity>()
            .HasIndex(a => new { a.UserId, a.Read, a.Timestamp });
    }

    // Fallback: alleen als AddDbContext elders NIET is geconfigureerd.
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // 1) probeer env var (Koyeb etc.)
            var conn =
                Environment.GetEnvironmentVariable("DefaultConnection")
                // 2) anders een veilige embedded default (productie container)
                ?? "Database=/app/CLOCKWISE.FDB;User=SYSDBA;Password=masterkey;Dialect=3;Charset=UTF8;ServerType=1;ClientLibrary=/usr/lib/x86_64-linux-gnu/libfbclient.so.2;Pooling=false";

            optionsBuilder.UseFirebird(conn);
        }
    }
}
