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

        // Existing Company/ProjectGroup/Project relationships
        modelBuilder.Entity<ProjectGroup>()
            .HasOne(pg => pg.Company)
            .WithMany(c => c.ProjectGroups)
            .HasForeignKey(pg => pg.CompanyId);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.ProjectGroup)
            .WithMany(pg => pg.Projects)
            .HasForeignKey(p => p.ProjectGroupId);

        // USER RELATIONSHIPS
        // User self-referencing relationship (Manager -> ManagedUsers)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Manager)
            .WithMany(u => u.ManagedUsers)
            .HasForeignKey(u => u.ManagerId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete

        // Configure UserType as required field with check constraint
        modelBuilder.Entity<User>()
            .Property(u => u.Rank)
            .IsRequired()
            .HasMaxLength(20);
        // TIMEENTRY RELATIONSHIPS
        // TimeEntry -> User relationship (who owns the time entry)
        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.User)
            .WithMany(u => u.TimeEntries)
            .HasForeignKey(te => te.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.Project)
            .WithMany()
            .HasForeignKey(te => te.ProjectId);

        // TimeEntry -> User relationship (who processed the time entry)
        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.ProcessedByUser)
            .WithMany(u => u.ProcessedTimeEntries)
            .HasForeignKey(te => te.ProcessedBy)
            .OnDelete(DeleteBehavior.Restrict); // Don't delete time entries if processor is deleted

        // Configure Status field with check constraint
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("opgeslagen");
            
        // Configure decimal precision for costs
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.TravelCosts)
            .HasPrecision(10, 2);
            
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.Expenses)
            .HasPrecision(10, 2);

        // Configure RequestDate with default value
        modelBuilder.Entity<TimeEntry>()
            .Property(te => te.RequestDate)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // VACATION REQUEST RELATIONSHIPS
        modelBuilder.Entity<VacationRequest>()
            .HasOne(v => v.User)
            .WithMany() // Or configure a collection on User if needed
            .HasForeignKey(v => v.UserId);

        // VacationRequest ProcessedBy relationship
        modelBuilder.Entity<VacationRequest>()
            .HasOne(v => v.ProcessedByUser)
            .WithMany()
            .HasForeignKey(v => v.ProcessedBy)
            .OnDelete(DeleteBehavior.SetNull); // If admin is deleted, set ProcessedBy to null

        // ACTIVITY RELATIONSHIPS
        modelBuilder.Entity<Activity>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId);

        // USER PROJECT RELATIONSHIPS
        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.User)
            .WithMany()
            .HasForeignKey(up => up.UserId);

        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.Project)
            .WithMany()
            .HasForeignKey(up => up.ProjectId);

        modelBuilder.Entity<UserProject>()
            .HasOne(up => up.AssignedByUser)
            .WithMany()
            .HasForeignKey(up => up.AssignedByUserId)
            .IsRequired(false);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseFirebird("User=sysdba;Password=masterkey;Database=/firebird/data/clockwise.fdb;DataSource=localhost;Port=3051;");
        }
    }
}