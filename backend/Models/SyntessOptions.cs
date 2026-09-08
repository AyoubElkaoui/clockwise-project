using Microsoft.Extensions.Configuration;

namespace ClockwiseProject.Backend.Models
{
    /// <summary>
    /// Klantspecifieke Syntess Atrium-sleutels (GC_ID's, kostensoorten, taakcodes, generators).
    /// Alle waarden komen uit de "Syntess"-sectie in appsettings.json; de defaults hieronder zijn
    /// de waarden van de huidige administratie zodat een ontbrekende sleutel niet stil naar 0 valt.
    ///
    /// Registratie (Program.cs):
    ///   builder.Services.Configure&lt;SyntessOptions&gt;(builder.Configuration.GetSection(SyntessOptions.SectionName));
    /// Zolang die registratie er niet is, gebruiken services <see cref="FromConfiguration"/>.
    /// </summary>
    public class SyntessOptions
    {
        public const string SectionName = "Syntess";

        /// <summary>AT_ADMINIS.GC_ID van de administratie waarin geboekt wordt.</summary>
        public int AdminisGcId { get; set; } = 1;

        // AT_DOCUMENT (urenstaat-document)
        public int StentStId { get; set; } = 175;
        public int AfdelingGcId { get; set; } = 100004;
        public int DagboekGcId { get; set; } = 100025;
        public int LayoutGcId { get; set; } = 100281;
        public int ValutaGcId { get; set; } = 100001;
        public int BoekjaarGcId { get; set; } = 100028;
        public int GebrGcId { get; set; } = 100001;

        /// <summary>AT_TAAK.GC_CODE's die als werktaak (met project) gelden.</summary>
        public List<string> WorkTaskCodes { get; set; } = new() { "30", "40" };

        /// <summary>Prefix van AT_TAAK.GC_CODE voor verlof-/afwezigheidstaken.</summary>
        public string LeaveTaskPrefix { get; set; } = "Z";

        /// <summary>Taakcode-prefixes/-codes waarvoor een urenbudget (user_hour_allocations) geldt.</summary>
        public List<string> BudgetTaskPrefixes { get; set; } = new() { "I", "Z", "SLEEFTIJD" };

        // Werktaken en bijbehorende kostensoorten
        public int MontageTaakGcId { get; set; } = 100256;
        public int TekenkamerTaakGcId { get; set; } = 100032;
        public int KostsrtUrenMontage { get; set; } = 100268;
        public int KostsrtUrenTekenkamer { get; set; } = 100278;
        public int KostsrtReisMontage { get; set; } = 100269;
        public int KostsrtReisTekenkamer { get; set; } = 100279;
        public int KostsrtReisVerblijf { get; set; } = 100167;
        public int KostsrtMateriaal { get; set; } = 100288;

        /// <summary>Prefix van AT_DOCUMENT.GC_CODE voor urenstaat-documenten.</summary>
        public string DocumentCodePrefix { get; set; } = "URS";

        // Firebird generators
        public string GeneratorUrenbreg { get; set; } = "AG_URENBREG";
        public string GeneratorDocument { get; set; } = "AG_DOCUMENT";
        /// <summary>Generator voor AT_URENSTAT.DOCUMENT_GC_ID wanneer er geen AT_DOCUMENT wordt aangemaakt.</summary>
        public string UrenstatGenerator { get; set; } = "AT_URENSTAT_GEN";

        /// <summary>AT_MEDEW.GC_ID's die als manager gelden (legacy Firebird-user-repository).</summary>
        public List<int> ManagerMedewGcIds { get; set; } = new() { 100002 };

        /// <summary>Aantal uren per verlofdag.</summary>
        public decimal HoursPerDay { get; set; } = 8m;

        /// <summary>Leest de sectie uit IConfiguration (tijdelijke helper tot IOptions is geregistreerd).</summary>
        public static SyntessOptions FromConfiguration(IConfiguration configuration)
        {
            return configuration.GetSection(SectionName).Get<SyntessOptions>() ?? new SyntessOptions();
        }

        public bool IsLeaveTaskCode(string? code)
        {
            if (string.IsNullOrWhiteSpace(code)) return false;
            return code.Trim().StartsWith(LeaveTaskPrefix, StringComparison.OrdinalIgnoreCase);
        }

        public bool IsBudgetTaskCode(string? code)
        {
            if (string.IsNullOrWhiteSpace(code)) return false;
            var trimmed = code.Trim();
            return BudgetTaskPrefixes.Any(p =>
                p.Length > 1
                    ? trimmed.Equals(p, StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith(p, StringComparison.OrdinalIgnoreCase)
                    : trimmed.StartsWith(p, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>Valideert dat generator-namen alleen uit identifier-tekens bestaan (worden in SQL geïnterpoleerd).</summary>
        public void Validate()
        {
            foreach (var (name, value) in new[] { ("GeneratorUrenbreg", GeneratorUrenbreg), ("GeneratorDocument", GeneratorDocument), ("UrenstatGenerator", UrenstatGenerator) })
            {
                if (string.IsNullOrWhiteSpace(value) || !value.All(c => char.IsLetterOrDigit(c) || c == '_' || c == '$'))
                    throw new InvalidOperationException($"Syntess:{name} bevat een ongeldige generator-naam: '{value}'");
            }
        }
    }
}
