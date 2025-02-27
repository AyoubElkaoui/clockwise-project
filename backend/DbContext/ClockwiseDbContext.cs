using Microsoft.EntityFrameworkCore;

public class ClockwiseDbContext : DbContext
{
    public ClockwiseDbContext(DbContextOptions<ClockwiseDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<ProjectGroup> ProjectGroups { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Relatie: ProjectGroup → Company
        modelBuilder.Entity<ProjectGroup>()
            .HasOne(pg => pg.Company)
            .WithMany(c => c.ProjectGroups)
            .HasForeignKey(pg => pg.CompanyId);

        // Relatie: Project → ProjectGroup
        modelBuilder.Entity<Project>()
            .HasOne(p => p.ProjectGroup)
            .WithMany(pg => pg.Projects)
            .HasForeignKey(p => p.ProjectGroupId);

        // Relatie: TimeEntry → User
        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.User)
            .WithMany()
            .HasForeignKey(te => te.UserId);

        // Relatie: TimeEntry → Project
        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.Project)
            .WithMany()
            .HasForeignKey(te => te.ProjectId);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Zorg ervoor dat je het juiste pad en de juiste connectiestring gebruikt
            optionsBuilder.UseFirebird("User=sysdba;Password=masterkey;Database=C:\\Users\\Ayoub Werk account\\Desktop\\clockwise-project\\backend\\CLOCKWISE.FDB;DataSource=localhost;Port=3050;");
        }
    }
}