using System;
using System.Linq;
using System.Collections.Generic;

public static class SeedData
{
    public static void Initialize(ClockwiseDbContext context)
    {
        // Alleen seeden als de database leeg is
        if (context.Users.Any() && context.Projects.Any())
        {
            return; // Database is al gevuld
        }

        // Seed Companies
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

        // Seed ProjectGroups
        var projectGroups = new List<ProjectGroup>();
        
        // Elmar Services
        projectGroups.Add(new ProjectGroup { Name = "100 Project", CompanyId = companies[0].Id });
        projectGroups.Add(new ProjectGroup { Name = "IKO projecten", CompanyId = companies[0].Id });
        
        // Elmar International
        projectGroups.Add(new ProjectGroup { Name = "200 Project", CompanyId = companies[1].Id });
        
        // ICT
        projectGroups.Add(new ProjectGroup { Name = "Techniek", CompanyId = companies[2].Id });
        projectGroups.Add(new ProjectGroup { Name = "RTW Techniek", CompanyId = companies[2].Id });
        projectGroups.Add(new ProjectGroup { Name = "Feestdagen", CompanyId = companies[2].Id });
        projectGroups.Add(new ProjectGroup { Name = "Projectleiders", CompanyId = companies[2].Id });
        
        // Keysergroep
        projectGroups.Add(new ProjectGroup { Name = "300 Series", CompanyId = companies[3].Id });
        
        // Overmatig Uitgroeien
        projectGroups.Add(new ProjectGroup { Name = "Onderhoud Uitgroeiing", CompanyId = companies[4].Id });
        
        context.ProjectGroups.AddRange(projectGroups);
        context.SaveChanges();

        // Complexe project namen, gebaseerd op de voorbeelden
        var projects = new List<Project>
        {
            // Elmar Services - 100 Project
            new Project { Name = "2023-100-005 - Naam TD", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "KVK 38 en 39 Verbouwing", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "Renovatie Utrecht", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-008 - Installatie Systemen", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-009 - Kantoorverbouwing", ProjectGroupId = projectGroups[0].Id },
            new Project { Name = "2024-100-010 - ZWV Zutphen", ProjectGroupId = projectGroups[0].Id },
            
            // Elmar Services - IKO projecten
            new Project { Name = "IKO-23-053 - Kaiwit 38 en 39 Velhurst", ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-001 - Renovatie Delftlaan", ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-002 - Nieuwbouw Amstelveen", ProjectGroupId = projectGroups[1].Id },
            new Project { Name = "IKO-24-003 - Verbouwing Rotterdam", ProjectGroupId = projectGroups[1].Id },
            
            // Elmar International - 200 Project
            new Project { Name = "INT-2023-001 - Berlijn Kantoor", ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2023-002 - Parijs Renovatie", ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2024-001 - Brussel Winkelcentrum", ProjectGroupId = projectGroups[2].Id },
            new Project { Name = "INT-2024-002 - Londen Appartementen", ProjectGroupId = projectGroups[2].Id },
            
            // ICT - Techniek
            new Project { Name = "Server Onderhoud Q1 2025", ProjectGroupId = projectGroups[3].Id },
            new Project { Name = "Hardware Installaties Hoofdkantoor", ProjectGroupId = projectGroups[3].Id },
            new Project { Name = "Cloud Migratie Fase 2", ProjectGroupId = projectGroups[3].Id },
            
            // ICT - RTW Techniek
            new Project { Name = "RTW-001 - Netwerkbeveiliging", ProjectGroupId = projectGroups[4].Id },
            new Project { Name = "RTW-002 - Backup Infrastructure", ProjectGroupId = projectGroups[4].Id },
            
            // ICT - Feestdagen
            new Project { Name = "Feestdagen 2025", ProjectGroupId = projectGroups[5].Id },
            new Project { Name = "ATV Dagen 2025", ProjectGroupId = projectGroups[5].Id },
            
            // ICT - Projectleiders
            new Project { Name = "Project Management Team", ProjectGroupId = projectGroups[6].Id },
            new Project { Name = "Management Support", ProjectGroupId = projectGroups[6].Id },
            
            // Keysergroep - 300 Series
            new Project { Name = "KEY-300-001 - Utrecht Hoofdkantoor", ProjectGroupId = projectGroups[7].Id },
            new Project { Name = "KEY-300-002 - Amsterdam Winkelcentrum", ProjectGroupId = projectGroups[7].Id },
            new Project { Name = "KEY-300-003 - Rotterdam Havengebied", ProjectGroupId = projectGroups[7].Id },
            
            // Overmatig Uitgroeien - Onderhoud Uitgroeiing
            new Project { Name = "OU-2024-001 - Periodiek Onderhoud", ProjectGroupId = projectGroups[8].Id },
            new Project { Name = "OU-2024-002 - Specifieke Inspectie", ProjectGroupId = projectGroups[8].Id },
        };
        
        // Voeg nog 20 projecten toe om tot 50 te komen
        for (int i = 1; i <= 22; i++)
        {
            int groupIndex = i % projectGroups.Count;
            projects.Add(new Project 
            { 
                Name = $"Project-{i:D3} - {RandomProjectDesc()} {RandomLocation()}", 
                ProjectGroupId = projectGroups[groupIndex].Id 
            });
        }
        
        context.Projects.AddRange(projects);
        context.SaveChanges();

        // Seed Users (20+ gebruikers)
        var ranks = new[] { "user", "manager", "admin" };
        var firstNames = new[] { "Ayoub", "Jan", "Piet", "Klaas", "Mohammed", "Lisa", "Anna", "Sophie", "Thomas", "Kevin", "Luuk", "Daan", "Emma", "Julia", "Sanne", "Lieke", "Bas", "Thijs", "Lars", "Tim", "Niels", "Ruben" };
        var lastNames = new[] { "El Kaoui", "de Vries", "Jansen", "Visser", "van Dijk", "Bakker", "Janssen", "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra" };
        var functions = new[] { "Developer", "Projectleider", "Manager", "Administratief Medewerker", "Uitvoerder", "Technicus", "Verkoper", "Inkoper", "Accountmanager", "Architect", "Tester", "HR Medewerker", "Financieel Medewerker" };
        
        var users = new List<User>();
        
        // Admin gebruiker
        users.Add(new User {
            FirstName = "Admin",
            LastName = "User",
            Email = "admin@example.com",
            Address = "Adminweg",
            HouseNumber = "1",
            PostalCode = "1234 AB",
            City = "Adminstad",
            LoginName = "admin",
            Password = "adminpass",
            Rank = "admin",
            Function = "Systeembeheerder"
        });
        
        // Manager gebruiker
        users.Add(new User {
            FirstName = "Manager",
            LastName = "User",
            Email = "manager@example.com",
            Address = "Managerweg",
            HouseNumber = "2",
            PostalCode = "2345 BC",
            City = "Managerstad",
            LoginName = "manager",
            Password = "managerpass",
            Rank = "manager",
            Function = "Project Manager"
        });
        
        // Test gebruiker
        users.Add(new User {
            FirstName = "Ayoub",
            LastName = "El Kaoui",
            Email = "ayoub@example.com",
            Address = "Voorbeeldstraat",
            HouseNumber = "10",
            PostalCode = "1234 AB",
            City = "Voorbeeldstad",
            LoginName = "ayoub",
            Password = "password123",
            Rank = "user",
            Function = "Developer"
        });
        
        // Genereer overige gebruikers
        var random = new Random();
        for (int i = 0; i < 17; i++) // 17 + 3 bestaande = 20 gebruikers
        {
            var firstName = firstNames[random.Next(firstNames.Length)];
            var lastName = lastNames[random.Next(lastNames.Length)];
            var function = functions[random.Next(functions.Length)];
            var rank = ranks[random.Next(ranks.Length) < 6 ? 0 : random.Next(ranks.Length) < 8 ? 1 : 2]; // Meeste gebruikers, dan managers, weinig admins
            
            users.Add(new User {
                FirstName = firstName,
                LastName = lastName,
                Email = $"{firstName.ToLower()}.{lastName.ToLower()}@example.com".Replace(" ", ""),
                Address = $"{RandomStreet()}",
                HouseNumber = random.Next(1, 100).ToString(),
                PostalCode = $"{random.Next(1000, 9999)} {(char)('A' + random.Next(26))}{(char)('A' + random.Next(26))}",
                City = RandomCity(),
                LoginName = $"{firstName.ToLower()}{random.Next(100, 999)}",
                Password = "password123",
                Rank = rank,
                Function = function
            });
        }
        
        context.Users.AddRange(users);
        context.SaveChanges();

        // Koppel Users aan Projects (UserProjects)
        var userProjects = new List<UserProject>();
        foreach (var user in users)
        {
            // Koppel iedere gebruiker aan 3-8 projecten
            int numProjects = random.Next(3, 9);
            var userProjectIds = new HashSet<int>();
            
            for (int i = 0; i < numProjects; i++)
            {
                var projectId = projects[random.Next(projects.Count)].Id;
                if (!userProjectIds.Contains(projectId))
                {
                    userProjectIds.Add(projectId);
                    userProjects.Add(new UserProject
                    {
                        UserId = user.Id,
                        ProjectId = projectId,
                        AssignedDate = DateTime.Now.AddDays(-random.Next(1, 60)),
                        AssignedByUserId = users.Where(u => u.Rank == "admin" || u.Rank == "manager")
                            .Select(u => u.Id)
                            .OrderBy(_ => random.Next()) // Random volgorde
                            .FirstOrDefault()
                    });
                }
            }
        }
        
        context.UserProjects.AddRange(userProjects);
        context.SaveChanges();

        // TimeEntries genereren
        var timeEntries = new List<TimeEntry>();
        var statuses = new[] { "opgeslagen", "ingeleverd", "goedgekeurd", "afgekeurd" };
        
        foreach (var user in users)
        {
            // Bepaal op welke projecten deze gebruiker uren kan schrijven
            var allowedProjects = userProjects
                .Where(up => up.UserId == user.Id)
                .Select(up => up.ProjectId)
                .ToList();
                
            if (!allowedProjects.Any()) continue;
            
            // Genereer voor de afgelopen 30 dagen uren
            for (int day = 0; day < 30; day++)
            {
                // Niet in het weekend
                var date = DateTime.Now.AddDays(-day);
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                    continue;
                    
                // 70% kans op een entry
                if (random.Next(10) >= 3)
                {
                    var projectId = allowedProjects[random.Next(allowedProjects.Count)];
                    var startHour = random.Next(8, 10); // Start tussen 8:00 en 9:59
                    var startMin = random.Next(0, 60);
                    var workHours = random.Next(6, 9); // 6-8 uur werken
                    var breakMinutes = random.Next(15, 60); // 15-59 minuten pauze
                    
                    var startTime = new DateTime(date.Year, date.Month, date.Day, startHour, startMin, 0);
                    var endTime = startTime.AddHours(workHours);
                    
                    int distanceKm = random.Next(0, 80); // 0-79 km
                    decimal travelCosts = (decimal)(distanceKm * 0.19); // €0.19 per km
                    decimal expenses = random.Next(0, 4) == 0 ? (decimal)(random.Next(1, 25)) : 0; // 25% kans op onkosten (€1-24)
                    
                    string notes = "";
                    if (random.Next(0, 4) == 0) // 25% kans op notities
                    {
                        notes = RandomNote();
                    }
                    
                    // Status afhankelijk van datum
                    string status;
                    if (day < 7) // Afgelopen week
                        status = statuses[random.Next(0, 2)]; // Opgeslagen of ingeleverd
                    else if (day < 14) // 1-2 weken terug
                        status = statuses[random.Next(0, 3)]; // Opgeslagen, ingeleverd of goedgekeurd
                    else // 2+ weken terug
                        status = statuses[random.Next(1, 4)]; // Ingeleverd, goedgekeurd of afgekeurd
                    
                    timeEntries.Add(new TimeEntry
                    {
                        UserId = user.Id,
                        ProjectId = projectId,
                        StartTime = startTime,
                        EndTime = endTime,
                        BreakMinutes = breakMinutes,
                        DistanceKm = distanceKm,
                        TravelCosts = travelCosts,
                        Expenses = expenses,
                        Notes = notes,
                        Status = status
                    });
                }
            }
        }
        
        context.TimeEntries.AddRange(timeEntries);
        context.SaveChanges();

        // Vakantie-aanvragen genereren
        var vacationRequests = new List<VacationRequest>();
        var vacationStatuses = new[] { "pending", "approved", "rejected" };
        
        foreach (var user in users)
        {
            // 2-5 vakantieaanvragen per gebruiker
            int numRequests = random.Next(2, 6);
            
            for (int i = 0; i < numRequests; i++)
            {
                bool isPast = random.Next(0, 2) == 0; // 50% kans op verleden, 50% op toekomst
                
                // Startdatum
                DateTime startDate;
                if (isPast)
                {
                    startDate = DateTime.Now.AddDays(-random.Next(60, 180)); // 2-6 maanden geleden
                }
                else
                {
                    startDate = DateTime.Now.AddDays(random.Next(14, 180)); // 2 weken tot 6 maanden in de toekomst
                }
                
                // Vakantieduur (1-14 dagen)
                int durationDays = random.Next(1, 15);
                DateTime endDate = startDate.AddDays(durationDays - 1);
                
                // Status afhankelijk van datum
                string status;
                if (isPast)
                {
                    status = vacationStatuses[random.Next(1, 3)]; // Approved of rejected
                }
                else
                {
                    status = random.Next(0, 4) == 0 ? vacationStatuses[0] : vacationStatuses[random.Next(1, 3)]; // 25% pending, 75% approved/rejected
                }
                
                // Reden
                string reason = "";
                if (random.Next(0, 3) > 0) // 66% kans op een reden
                {
                    reason = RandomVacationReason();
                }
                
                // Uren berekenen (8 uur per werkdag)
                int workDays = 0;
                for (DateTime day = startDate; day <= endDate; day = day.AddDays(1))
                {
                    if (day.DayOfWeek != DayOfWeek.Saturday && day.DayOfWeek != DayOfWeek.Sunday)
                    {
                        workDays++;
                    }
                }
                double hours = workDays * 8;
                
                vacationRequests.Add(new VacationRequest
                {
                    UserId = user.Id,
                    StartDate = startDate,
                    EndDate = endDate,
                    Hours = hours,
                    Reason = reason,
                    Status = status
                });
            }
        }
        
        context.VacationRequests.AddRange(vacationRequests);
        context.SaveChanges();

        // Genereer wat activiteiten (notificaties)
        var activities = new List<Activity>();
        
        // Activiteiten voor time entries
        foreach (var entry in timeEntries.Where(te => te.Status == "goedgekeurd" || te.Status == "afgekeurd").Take(50))
        {
            var message = entry.Status == "goedgekeurd" 
                ? $"Je uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn goedgekeurd"
                : $"Je uren voor {entry.StartTime.ToString("dd-MM-yyyy")} zijn afgekeurd";
                
            var details = entry.Status == "afgekeurd" && random.Next(0, 2) == 0
                ? $"Project: {entry.Project?.Name ?? "Onbekend"}, Reden: {RandomRejectionReason()}"
                : $"Project: {entry.Project?.Name ?? "Onbekend"}";
                
            activities.Add(new Activity
            {
                UserId = entry.UserId,
                Timestamp = DateTime.Now.AddDays(-random.Next(0, 10)).AddHours(-random.Next(0, 24)),
                Type = "time_entry",
                Action = entry.Status == "goedgekeurd" ? "approved" : "rejected",
                Message = message,
                Details = details,
                Read = random.Next(0, 3) > 0 // 66% kans op gelezen
            });
        }
        
        // Activiteiten voor vakantie-aanvragen
        foreach (var vacation in vacationRequests.Where(vr => vr.Status != "pending").Take(30))
        {
            var message = vacation.Status == "approved" 
                ? $"Je vakantie-aanvraag ({vacation.StartDate.ToString("dd-MM")} - {vacation.EndDate.ToString("dd-MM")}) is goedgekeurd"
                : $"Je vakantie-aanvraag ({vacation.StartDate.ToString("dd-MM")} - {vacation.EndDate.ToString("dd-MM")}) is afgewezen";
                
            var details = vacation.Status == "rejected" && random.Next(0, 2) == 0
                ? $"Reden: {RandomRejectionReason()}"
                : $"Aantal uren: {vacation.Hours}";
                
            activities.Add(new Activity
            {
                UserId = vacation.UserId,
                Timestamp = DateTime.Now.AddDays(-random.Next(0, 15)).AddHours(-random.Next(0, 24)),
                Type = "vacation",
                Action = vacation.Status == "approved" ? "approved" : "rejected",
                Message = message,
                Details = details,
                Read = random.Next(0, 3) > 0 // 66% kans op gelezen
            });
        }
        
        // Activiteiten voor project toewijzingen
        foreach (var userProject in userProjects.Take(40))
        {
            var project = projects.FirstOrDefault(p => p.Id == userProject.ProjectId);
            if (project == null) continue;
            
            var message = $"Je bent toegewezen aan project '{project.Name}'";
                
            activities.Add(new Activity
            {
                UserId = userProject.UserId,
                Timestamp = userProject.AssignedDate,
                Type = "project",
                Action = "assigned",
                Message = message,
                Details = $"Toegewezen door: {users.FirstOrDefault(u => u.Id == userProject.AssignedByUserId)?.FirstName} {users.FirstOrDefault(u => u.Id == userProject.AssignedByUserId)?.LastName}",
                Read = random.Next(0, 4) > 0 // 75% kans op gelezen
            });
        }
        
        context.Activities.AddRange(activities);
        context.SaveChanges();
    }
    
    // Helper functions
    private static string RandomProjectDesc()
    {
        var random = new Random();
        var descriptions = new[]
        {
            "Renovatie", "Nieuwbouw", "Verbouwing", "Installatie", "Onderhoud", 
            "Uitbreiding", "Modernisering", "Herinrichting", "Oplevering", "Inspectie",
            "Kantoorpand", "Winkelcentrum", "Appartementen", "Bedrijfsterrein"
        };
        
        return descriptions[random.Next(descriptions.Length)];
    }
    
    private static string RandomLocation()
    {
        var random = new Random();
        var locations = new[]
        {
            "Amsterdam", "Rotterdam", "Utrecht", "Den Haag", "Eindhoven", 
            "Groningen", "Tilburg", "Almere", "Breda", "Nijmegen",
            "Apeldoorn", "Haarlem", "Enschede", "Arnhem", "Amersfoort",
            "Zaanstad", "Den Bosch", "Haarlemmermeer", "Zwolle", "Zoetermeer"
        };
        
        return locations[random.Next(locations.Length)];
    }
    
    private static string RandomStreet()
    {
        var random = new Random();
        var streets = new[]
        {
            "Hoofdstraat", "Dorpsstraat", "Kerkstraat", "Schoolstraat", "Molenweg",
            "Stationsweg", "Julianastraat", "Beatrixstraat", "Wilhelminastraat", "Oranjestraat",
            "Industrieweg", "Nieuwstraat", "Langstraat", "Kortestraat", "Marktplein",
            "Emmastraat", "Bernhardstraat", "Marijkestraat", "Irenelaan", "Koningsstraat"
        };
        
        return streets[random.Next(streets.Length)];
    }
    
    private static string RandomCity()
    {
        var random = new Random();
        var cities = new[]
        {
            "Amsterdam", "Rotterdam", "Utrecht", "Den Haag", "Eindhoven", 
            "Groningen", "Tilburg", "Almere", "Breda", "Nijmegen",
            "Apeldoorn", "Haarlem", "Enschede", "Arnhem", "Amersfoort",
            "Zaanstad", "Den Bosch", "Haarlemmermeer", "Zwolle", "Zoetermeer"
        };
        
        return cities[random.Next(cities.Length)];
    }
    
    private static string RandomNote()
    {
        var random = new Random();
        var notes = new[]
        {
            "Afgerond in overleg met klant",
            "Extra werkzaamheden uitgevoerd",
            "Materialen besteld voor vervolg",
            "Besproken met projectleider",
            "Wachten op goedkeuring van de klant",
            "Toegang tot locatie was vertraagd",
            "Revisie na feedback klant",
            "Laatste fase project",
            "Eerste oplevering",
            "Bezoek bouwplaats samen met ontwerper",
            "Voortgangsbespreking gehouden",
            "Installatiewerk voltooid",
            "Overleg met onderaannemers",
            "Keuringen uitgevoerd",
            "Aanpassingen gemaakt conform wensen klant"
        };
        
        return notes[random.Next(notes.Length)];
    }
    
    private static string RandomVacationReason()
    {
        var random = new Random();
        var reasons = new[]
        {
            "Zomervakantie",
            "Wintervakantie",
            "Familiebezoek",
            "Citytrip",
            "Persoonlijke omstandigheden",
            "Bruiloft",
            "Verhuizing",
            "Medische afspraak",
            "Studie",
            "Vakantie buitenland",
            "Lang weekend",
            "Verlofdag",
            "Cursus",
            "Training"
        };
        
        return reasons[random.Next(reasons.Length)];
    }
    
    private static string RandomRejectionReason()
    {
        var random = new Random();
        var reasons = new[]
        {
            "Ontbrekende projectcode",
            "Onjuiste tijdsregistratie",
            "Geen toestemming voor overuren",
            "Project al afgesloten",
            "Overlap met eerder geregistreerde uren",
            "Onvoldoende details in toelichting",
            "Uren overschrijden budget",
            "Nog niet goedgekeurd door klant",
            "Incorrect projectnummer",
            "Ongeautoriseerde activiteit"
        };
        
        return reasons[random.Next(reasons.Length)];
    }
}