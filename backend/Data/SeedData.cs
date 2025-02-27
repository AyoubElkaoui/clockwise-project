using System;
using System.Linq;

public static class SeedData
{
    public static void Initialize(ClockwiseDbContext context)
    {
        if (!context.Companies.Any())
        {
            var company1 = new Company { Name = "Elmar Services" };
            var company2 = new Company { Name = "Elmar Services International" };
            var company3 = new Company { Name = "Keysergroep" };

            context.Companies.AddRange(company1, company2, company3);
            context.SaveChanges();

            var group100 = new ProjectGroup { Name = "100 Series", CompanyId = company1.Id };
            var group200 = new ProjectGroup { Name = "200 Series", CompanyId = company2.Id };
            var group300 = new ProjectGroup { Name = "300 Series", CompanyId = company3.Id };

            context.ProjectGroups.AddRange(group100, group200, group300);
            context.SaveChanges();

            var projectA = new Project { Name = "Project A", ProjectGroupId = group100.Id };
            var projectB = new Project { Name = "Project B", ProjectGroupId = group200.Id };
            var projectC = new Project { Name = "Project C", ProjectGroupId = group300.Id };

            context.Projects.AddRange(projectA, projectB, projectC);
            context.SaveChanges();
        }

        if (!context.Users.Any())
        {
            context.Users.AddRange(
                new User { Name = "Ayoub", Email = "ayoub@example.com" },
                new User { Name = "Elmar", Email = "elmar@example.com" }
            );
            context.SaveChanges();
        }

        if (!context.TimeEntries.Any())
        {
            context.TimeEntries.AddRange(
                new TimeEntry
                {
                    UserId = 1,
                    ProjectId = 1,
                    StartTime = DateTime.Now,
                    EndTime = DateTime.Now.AddHours(2),
                    BreakMinutes = 15,
                    DistanceKm = 10.5,
                    TravelCosts = 5.00m,
                    Expenses = 12.50m,
                    Notes = "Eerste werkdag"
                },
                new TimeEntry
                {
                    UserId = 2,
                    ProjectId = 2,
                    StartTime = DateTime.Now,
                    EndTime = DateTime.Now.AddHours(3),
                    BreakMinutes = 30,
                    DistanceKm = 25.0,
                    TravelCosts = 15.00m,
                    Expenses = 8.00m,
                    Notes = "Klantmeeting"
                }
            );
            context.SaveChanges();
        }
    }
}
