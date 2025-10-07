using System;
using System.Linq;
using System.Collections.Generic;

public static class SeedData
{
    public static void Initialize(ClockwiseDbContext context)
    {
        // Zorg dat de DB er is (handig bij embedded)
        context.Database.EnsureCreated();

        // ✅ Idempotent guard: als er al iets staat, NIET opnieuw seeden
        if (context.Companies.Any() || context.ProjectGroups.Any() || context.Projects.Any() || context.Users.Any())
        {
            Console.WriteLine("[SEED] Overgeslagen: database heeft al data.");
            return;
        }

        Console.WriteLine("[SEED] Start seeding...");

        // -----------------------
        // Companies
        // -----------------------
        var companies = new List<Company>
        {
            new Company { Name = "Elmar Services" },
            new Company { Name = "Elmar International" },
            new Company { Name = "ICT" },
            new Company { Name = "Keysergroep" },
            new Company { Name = "Overmatig Uitgroeien" }
        };
        context.Companies.AddRange(companies);
        context.SaveChanges();

        // -----------------------
        // ProjectGroups
        // -----------------------
        var projectGroups = new List<ProjectGroup>
        {
            // Elmar Services
            new ProjectGroup { Name = "100 Project",     CompanyId = companies[0].Id },
            new ProjectGroup { Name = "IKO projecten",   CompanyId = companies[0].Id },

            // Elmar International
            new ProjectGroup { Name = "200 Project",     CompanyId = companies[1].Id },

            // ICT
            new ProjectGroup { Name = "Techniek",        CompanyId = companies[2].Id },
            new ProjectGroup { Name = "RTW Techniek",    CompanyId = companies[2].Id },
            new ProjectGroup { Name = "Feestdagen",      CompanyId = companies[2].Id },
            new ProjectGroup { Name = "Projectleiders",  CompanyId = companies[2].Id },

            // Keysergroep
            new ProjectGroup { Name = "300 Series",      CompanyId = companies[3].Id },

            // Overmatig Uitgroeien
            new ProjectGroup { Name = "Onderhoud Uitgroeiing", CompanyId = companies[4].Id },
        };
        context.ProjectGroups.AddRange(projectGroups);
        context.SaveChanges();

        // -----------------------
        // Projects
        // -----------------------
        var projects = new List<Project>
        {
            // Elmar Services - 100 Project
            new Project { Name = "2023-100-005 - Naam TD",            ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "KVK 38 en 39 Verbouwing",           ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "Renovatie Utrecht",                 ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-008 - Installatie Systemen", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-009 - Kantoorverbouwing",  ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-010 - ZWV Zutphen",        ProjectGroupId = projectGroups[0].Id },

            // Elmar Services - IKO projecten
            new Project { Name = "IKO-23-053 - Kaiwit 38 en 39 Velhurst", ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-001 - Renovatie Delftlaan",      ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-002 - Nieuwbouw Amstelveen",     ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-003 - Verbouwing Rotterdam",     ProjectGroupId = projectGroups[1].Id },

            // Elmar International - 200 Project
            new Project { Name = "INT-2023-001 - Berlijn Kantoor",         ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2023-002 - Parijs Renovatie",        ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2024-001 - Brussel Winkelcentrum",   ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2024-002 - Londen Appartementen",    ProjectGroupId = projectGroups[2].Id },

            // ICT - Techniek
            new Project { Name = "Server Onderhoud Q1 2025",          ProjectGroupId = projectGroups[3].Id },
            new Project { Name = "Hardware Installaties Hoofdkantoor",ProjectGroupId = projectGroups[3].Id },
            new Project { Name = "Cloud Migratie Fase 2",             ProjectGroupId = projectGroups[3].Id },

            // ICT - RTW Techniek
            new Project { Name = "RTW-001 - Netwerkbeveiliging",      ProjectGroupId = projectGroups[4].Id },
            new Project { Name = "RTW-002 - Backup Infrastructure",   ProjectGroupId = projectGroups[4].Id },

            // ICT - Feestdagen
            new Project { Name = "Feestdagen 2025",                   ProjectGroupId = projectGroups[5].Id },
            new Project { Name = "ATV Dagen 2025",                    ProjectGroupId = projectGroups[5].Id },

            // ICT - Projectleiders
            new Project { Name = "Project Management Team",           ProjectGroupId = projectGroups[6].Id },
            new Project { Name = "Management Support",                ProjectGroupId = projectGroups[6].Id },

            // Keysergroep - 300 Series
            new Project { Name = "KEY-300-001 - Utrecht Hoofdkantoor",ProjectGroupId = projectGroups[7].Id },
            new Project { Name = "KEY-300-002 - Amsterdam Winkelcentrum", ProjectGroupId = projectGroups[7].Id },
            new Project { Name = "KEY-300-003 - Rotterdam Havengebied",   ProjectGroupId = projectGroups[7].Id },

            // Overmatig Uitgroeien - Onderhoud Uitgroeiing
            new Project { Name = "OU-2024-001 - Periodiek Onderhoud", ProjectGroupId = projectGroups[8].Id },
            new Project { Name = "OU-2024-002 - Specifieke Inspectie",ProjectGroupId = projectGroups[8].Id },
        };

        var rnd = new Random();

        // Voeg extra projecten toe
        for (int i = 1; i <= 22; i++)
        {
            var groupIndex = i % projectGroups.Count;
            projects.Add(new Project
            {
                Name = $"Project-{i:D3} - {RandomProjectDesc(rnd)} {RandomLocation(rnd)}",
                ProjectGroupId = projectGroups[groupIndex].Id
            });
        }

        context.Projects.AddRange(projects);
        context.SaveChanges();

        // -----------------------
        // Users
        // -----------------------
        var users = new List<User>
        {
            new User {
                FirstName = "Admin", LastName = "User", Email = "admin@example.com",
                Address = "Adminweg", HouseNumber = "1", PostalCode = "1234 AB", City = "Adminstad",
                LoginName = "admin", Password = "adminpass", Rank = "admin", Function = "Systeembeheerder"
            },
            new User {
                FirstName = "Manager", LastName = "User", Email = "manager@example.com",
                Address = "Managerweg", HouseNumber = "2", PostalCode = "2345 BC", City = "Managerstad",
                LoginName = "manager", Password = "managerpass", Rank = "manager", Function = "Project Manager"
            },
            new User {
                FirstName = "Ayoub", LastName = "El Kaoui", Email = "ayoub@example.com",
                Address = "Voorbeeldstraat", HouseNumber = "10", PostalCode = "1234 AB", City = "Voorbeeldstad",
                LoginName = "ayoub", Password = "password123", Rank = "user", Function = "Developer"
            }
        };

        var ranks     = new[] { "user", "manager", "admin" };
        var firstNames= new[] { "Ayoub", "Jan", "Piet", "Klaas", "Mohammed", "Lisa", "Anna", "Sophie", "Thomas", "Kevin", "Luuk", "Daan", "Emma", "Julia", "Sanne", "Lieke", "Bas", "Thijs", "Lars", "Tim", "Niels", "Ruben" };
        var lastNames = new[] { "El Kaoui", "de Vries", "Jansen", "Visser", "van Dijk", "Bakker", "Janssen", "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra" };
        var functions = new[] { "Developer", "Projectleider", "Manager", "Administratief Medewerker", "Uitvoerder", "Technicus", "Verkoper", "Inkoper", "Accountmanager", "Architect", "Tester", "HR Medewerker", "Financieel Medewerker" };

        // 17 extra users (totaal 20)
        for (int i = 0; i < 17; i++)
        {
            var fn   = firstNames[rnd.Next(firstNames.Length)];
            var ln   = lastNames[rnd.Next(lastNames.Length)];
            var func = functions[rnd.Next(functions.Length)];
            var rank = ranks[Math.Min(rnd.Next(10), 9) < 7 ? 0 : (rnd.Next(10) < 9 ? 1 : 2)]; // ~70% user, ~20% manager, ~10% admin

            var login = $"{fn.ToLower()}{rnd.Next(100, 999)}";

            users.Add(new User {
                FirstName = fn,
                LastName  = ln,
                Email     = $"{fn.ToLower()}.{ln.ToLower()}@example.com".Replace(" ", ""),
                Address   = RandomStreet(rnd),
                HouseNumber = rnd.Next(1, 100).ToString(),
                PostalCode  = $"{rnd.Next(1000, 9999)} {(char)('A' + rnd.Next(26))}{(char)('A' + rnd.Next(26))}",
                City        = RandomCity(rnd),
                LoginName   = login,
                Password    = "password123",
                Rank        = rank,
                Function    = func
            });
        }

        context.Users.AddRange(users);
        context.SaveChanges();

        // -----------------------
        // UserProjects
        // -----------------------
        var userProjects = new List<UserProject>();
        foreach (var user in users)
        {
            int numProjects = rnd.Next(3, 9);
            var chosen = new HashSet<int>();
            for (int i = 0; i < numProjects; i++)
            {
                var pid = projects[rnd.Next(projects.Count)].Id;
                if (chosen.Add(pid))
                {
                    userProjects.Add(new UserProject
                    {
                        UserId = user.Id,
                        ProjectId = pid,
                        AssignedDate = DateTime.Now.AddDays(-rnd.Next(1, 60)),
                        AssignedByUserId = users.Where(u => u.Rank is "admin" or "manager")
                                                .Select(u => u.Id)
                                                .OrderBy(_ => rnd.Next())
                                                .FirstOrDefault()
                    });
                }
            }
        }
        context.UserProjects.AddRange(userProjects);
        context.SaveChanges();

        // -----------------------
        // TimeEntries
        // -----------------------
        var timeEntries = new List<TimeEntry>();
        var statuses = new[] { "opgeslagen", "ingeleverd", "goedgekeurd", "afgekeurd" };

        foreach (var user in users)
        {
            var allowed = userProjects.Where(up => up.UserId == user.Id).Select(up => up.ProjectId).ToList();
            if (!allowed.Any()) continue;

            for (int d = 0; d < 30; d++)
            {
                var date = DateTime.Now.AddDays(-d);
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                if (rnd.Next(10) >= 3) // ~70% kans
                {
                    var projectId = allowed[rnd.Next(allowed.Count)];
                    var startHour = rnd.Next(8, 10);
                    var startMin  = rnd.Next(0, 60);
                    var workHours = rnd.Next(6, 9);
                    var breakMin  = rnd.Next(15, 60);

                    var start = new DateTime(date.Year, date.Month, date.Day, startHour, startMin, 0);
                    var end   = start.AddHours(workHours);

                    int distanceKm     = rnd.Next(0, 80);
                    decimal travelCost = (decimal)(distanceKm * 0.19);
                    decimal expenses   = rnd.Next(0, 4) == 0 ? (decimal)rnd.Next(1, 25) : 0;
                    string notes       = rnd.Next(0, 4) == 0 ? RandomNote(rnd) : "";

                    string status =
                        d < 7   ? statuses[rnd.Next(0, 2)] :
                        d < 14  ? statuses[rnd.Next(0, 3)] :
                                  statuses[rnd.Next(1, 4)];

                    timeEntries.Add(new TimeEntry
                    {
                        UserId = user.Id,
                        ProjectId = projectId,
                        StartTime = start,
                        EndTime   = end,
                        BreakMinutes = breakMin,
                        DistanceKm   = distanceKm,
                        TravelCosts  = travelCost,
                        Expenses     = expenses,
                        Notes        = notes,
                        Status       = status
                    });
                }
            }
        }
        context.TimeEntries.AddRange(timeEntries);
        context.SaveChanges();

        // -----------------------
        // VacationRequests
        // -----------------------
        var vacations = new List<VacationRequest>();
        var vacationStatuses = new[] { "pending", "approved", "rejected" };

        foreach (var user in users)
        {
            int num = rnd.Next(2, 6);
            for (int i = 0; i < num; i++)
            {
                bool isPast = rnd.Next(0, 2) == 0;
                DateTime start = isPast
                    ? DateTime.Now.AddDays(-rnd.Next(60, 180))
                    : DateTime.Now.AddDays(rnd.Next(14, 180));
                int durationDays = rnd.Next(1, 15);
                DateTime end = start.AddDays(durationDays - 1);

                string status = isPast
                    ? vacationStatuses[rnd.Next(1, 3)]
                    : (rnd.Next(0, 4) == 0 ? "pending" : vacationStatuses[rnd.Next(1, 3)]);

                string reason = rnd.Next(0, 3) > 0 ? RandomVacationReason(rnd) : "";

                int workDays = 0;
                for (var day = start; day <= end; day = day.AddDays(1))
                    if (day.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                        workDays++;
                double hours = workDays * 8;

                vacations.Add(new VacationRequest
                {
                    UserId = user.Id,
                    StartDate = start,
                    EndDate   = end,
                    Hours     = hours,
                    Reason    = reason,
                    Status    = status
                });
            }
        }
        context.VacationRequests.AddRange(vacations);
        context.SaveChanges();

        // -----------------------
        // Activities
        // -----------------------
        var activities = new List<Activity>();

        foreach (var entry in timeEntries.Where(te => te.Status is "goedgekeurd" or "afgekeurd").Take(50))
        {
            var message = entry.Status == "goedgekeurd"
                ? $"Je uren voor {entry.StartTime:dd-MM-yyyy} zijn goedgekeurd"
                : $"Je uren voor {entry.StartTime:dd-MM-yyyy} zijn afgekeurd";

            var details = entry.Status == "afgekeurd" && rnd.Next(0, 2) == 0
                ? $"Project: {entry.Project?.Name ?? "Onbekend"}, Reden: {RandomRejectionReason(rnd)}"
                : $"Project: {entry.Project?.Name ?? "Onbekend"}";

            activities.Add(new Activity
            {
                UserId = entry.UserId,
                Timestamp = DateTime.Now.AddDays(-rnd.Next(0, 10)).AddHours(-rnd.Next(0, 24)),
                Type = "time_entry",
                Action = entry.Status == "goedgekeurd" ? "approved" : "rejected",
                Message = message,
                Details = details,
                Read = rnd.Next(0, 3) > 0
            });
        }

        foreach (var v in vacations.Where(v => v.Status != "pending").Take(30))
        {
            var message = v.Status == "approved"
                ? $"Je vakantie-aanvraag ({v.StartDate:dd-MM} - {v.EndDate:dd-MM}) is goedgekeurd"
                : $"Je vakantie-aanvraag ({v.StartDate:dd-MM} - {v.EndDate:dd-MM}) is afgewezen";

            var details = v.Status == "rejected" && rnd.Next(0, 2) == 0
                ? $"Reden: {RandomRejectionReason(rnd)}"
                : $"Aantal uren: {v.Hours}";

            activities.Add(new Activity
            {
                UserId = v.UserId,
                Timestamp = DateTime.Now.AddDays(-rnd.Next(0, 15)).AddHours(-rnd.Next(0, 24)),
                Type = "vacation",
                Action = v.Status == "approved" ? "approved" : "rejected",
                Message = message,
                Details = details,
                Read = rnd.Next(0, 3) > 0
            });
        }

        foreach (var up in userProjects.Take(40))
        {
            var project = projects.FirstOrDefault(p => p.Id == up.ProjectId);
            if (project == null) continue;

            var assignedBy = users.FirstOrDefault(u => u.Id == up.AssignedByUserId);
            var byName = assignedBy != null ? $"{assignedBy.FirstName} {assignedBy.LastName}" : "Onbekend";

            activities.Add(new Activity
            {
                UserId = up.UserId,
                Timestamp = up.AssignedDate,
                Type = "project",
                Action = "assigned",
                Message = $"Je bent toegewezen aan project '{project.Name}'",
                Details = $"Toegewezen door: {byName}",
                Read = rnd.Next(0, 4) > 0
            });
        }

        context.Activities.AddRange(activities);
        context.SaveChanges();

        Console.WriteLine("[SEED] Klaar.");
    }

    // ---------- Helpers met gedeelde Random ----------
    private static string RandomProjectDesc(Random random) => new[]
    {
        "Renovatie","Nieuwbouw","Verbouwing","Installatie","Onderhoud",
        "Uitbreiding","Modernisering","Herinrichting","Oplevering","Inspectie",
        "Kantoorpand","Winkelcentrum","Appartementen","Bedrijfsterrein"
    }[random.Next(14)];

    private static string RandomLocation(Random random) => new[]
    {
        "Amsterdam","Rotterdam","Utrecht","Den Haag","Eindhoven",
        "Groningen","Tilburg","Almere","Breda","Nijmegen",
        "Apeldoorn","Haarlem","Enschede","Arnhem","Amersfoort",
        "Zaanstad","Den Bosch","Haarlemmermeer","Zwolle","Zoetermeer"
    }[random.Next(20)];

    private static string RandomStreet(Random random) => new[]
    {
        "Hoofdstraat","Dorpsstraat","Kerkstraat","Schoolstraat","Molenweg",
        "Stationsweg","Julianastraat","Beatrixstraat","Wilhelminastraat","Oranjestraat",
        "Industrieweg","Nieuwstraat","Langstraat","Kortestraat","Marktplein",
        "Emmastraat","Bernhardstraat","Marijkestraat","Irenelaan","Koningsstraat"
    }[random.Next(20)];

    private static string RandomCity(Random random) => RandomLocation(random);

    private static string RandomNote(Random random) => new[]
    {
        "Afgerond in overleg met klant","Extra werkzaamheden uitgevoerd","Materialen besteld voor vervolg",
        "Besproken met projectleider","Wachten op goedkeuring van de klant","Toegang tot locatie was vertraagd",
        "Revisie na feedback klant","Laatste fase project","Eerste oplevering",
        "Bezoek bouwplaats samen met ontwerper","Voortgangsbespreking gehouden",
        "Installatiewerk voltooid","Overleg met onderaannemers","Keuringen uitgevoerd",
        "Aanpassingen gemaakt conform wensen klant"
    }[random.Next(15)];

    private static string RandomVacationReason(Random random) => new[]
    {
        "Zomervakantie","Wintervakantie","Familiebezoek","Citytrip","Persoonlijke omstandigheden",
        "Bruiloft","Verhuizing","Medische afspraak","Studie","Vakantie buitenland",
        "Lang weekend","Verlofdag","Cursus","Training"
    }[random.Next(14)];

    private static string RandomRejectionReason(Random random) => new[]
    {
        "Ontbrekende projectcode","Onjuiste tijdsregistratie","Geen toestemming voor overuren",
        "Project al afgesloten","Overlap met eerder geregistreerde uren","Onvoldoende details in toelichting",
        "Uren overschrijden budget","Nog niet goedgekeurd door klant","Incorrect projectnummer","Ongeautoriseerde activiteit"
    }[random.Next(10)];
}
