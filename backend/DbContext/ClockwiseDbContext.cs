using Microsoft.EntityFrameworkCore;

public class ClockwiseDbContext : DbContext
{
    public ClockwiseDbContext(DbContextOptions<ClockwiseDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<ProjectGroup> ProjectGroups { get; set; }

    // Nieuwe DbSet voor vakantie-aanvragen
    public DbSet<VacationRequest> VacationRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ProjectGroup>()
            .HasOne(pg => pg.Company)
            .WithMany(c => c.ProjectGroups)
            .HasForeignKey(pg => pg.CompanyId);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.ProjectGroup)
            .WithMany(pg => pg.Projects)
            .HasForeignKey(p => p.ProjectGroupId);

        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.User)
            .WithMany()
            .HasForeignKey(te => te.UserId);

        modelBuilder.Entity<TimeEntry>()
            .HasOne(te => te.Project)
            .WithMany()
            .HasForeignKey(te => te.ProjectId);

        // Configuratie voor VacationRequest
        modelBuilder.Entity<VacationRequest>()
            .HasOne(v => v.User)
            .WithMany() // Of configureer een collectie op User
            .HasForeignKey(v => v.UserId);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Zorg ervoor dat je de juiste connectiestring gebruikt
            optionsBuilder.UseFirebird("User=sysdba;Password=masterkey;Database=C:\\Users\\elkao\\Desktop\\Stage_School_Projects\\clockwise-project\\backend\\CLOCKWISE.FDB;DataSource=localhost;Port=3050;");
        }
    }
}
