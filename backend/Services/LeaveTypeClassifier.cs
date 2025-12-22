namespace backend.Services;

/// <summary>
/// Classificeert AT_TAAK records op basis van GC_CODE in verlof/afwezigheid categorieën.
/// BELANGRIJK: gebruikt GC_CODE pattern matching, NIET LIKE op omschrijving.
/// </summary>
public static class LeaveTypeClassifier
{
    public const string SICK_LEAVE = "SICK_LEAVE";
    public const string VACATION = "VACATION";
    public const string TIME_FOR_TIME_ACCRUAL = "TIME_FOR_TIME_ACCRUAL";
    public const string TIME_FOR_TIME_USAGE = "TIME_FOR_TIME_USAGE";
    public const string SPECIAL_LEAVE = "SPECIAL_LEAVE";
    public const string PUBLIC_HOLIDAY = "PUBLIC_HOLIDAY";
    public const string FROST_DELAY = "FROST_DELAY";
    public const string SINGLE_DAY_LEAVE = "SINGLE_DAY_LEAVE";
    public const string SCHEDULED_FREE = "SCHEDULED_FREE";
    public const string MEDICAL_APPOINTMENT = "MEDICAL_APPOINTMENT";
    public const string OTHER_ABSENCE = "OTHER_ABSENCE";
    public const string UNKNOWN = "UNKNOWN";

    /// <summary>
    /// Bepaalt de categorie van een taak op basis van GC_CODE.
    /// </summary>
    public static string GetCategory(string code, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(code))
            return UNKNOWN;

        code = code.Trim().ToUpper();

        // Z20 - Arbeidsongeschikt
        // Z22 - WAO-verzuim
        if (code.StartsWith("Z20") || code.StartsWith("Z22"))
            return SICK_LEAVE;

        // Z05 - Vakantie en verlof eigen rekening
        // Z09 - Opname T.v.T
        if (code.StartsWith("Z05") || code.StartsWith("Z09"))
            return VACATION;

        // Z08 - Opbouw T.v.T
        if (code.StartsWith("Z08"))
            return TIME_FOR_TIME_ACCRUAL;

        // Z06 - Bijzonder verlof
        if (code.StartsWith("Z06"))
            return SPECIAL_LEAVE;

        // Z10 - Erkende feestdag
        if (code.StartsWith("Z10"))
            return PUBLIC_HOLIDAY;

        // Z11 - Vorstverlet
        if (code.StartsWith("Z11"))
            return FROST_DELAY;

        // Z04 - Verlof (Snipperdag)
        if (code.StartsWith("Z04"))
            return SINGLE_DAY_LEAVE;

        // Z03 - ATV (Roostervrij)
        if (code.StartsWith("Z03"))
            return SCHEDULED_FREE;

        // Z21 - Bezoek huisarts/tandarts
        if (code.StartsWith("Z21"))
            return MEDICAL_APPOINTMENT;

        // Fallback: algemene Z-code
        if (code.StartsWith("Z"))
            return OTHER_ABSENCE;

        return UNKNOWN;
    }

    /// <summary>
    /// Controleert of een taakcode een verlof/afwezigheid taak is.
    /// </summary>
    public static bool IsLeaveTask(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        return code.Trim().ToUpper().StartsWith("Z");
    }

    /// <summary>
    /// Geeft een Nederlandse omschrijving van de categorie.
    /// </summary>
    public static string GetCategoryDisplayName(string category)
    {
        return category switch
        {
            SICK_LEAVE => "Ziekteverlof",
            VACATION => "Vakantie",
            TIME_FOR_TIME_ACCRUAL => "T.v.T. Opbouw",
            TIME_FOR_TIME_USAGE => "T.v.T. Opname",
            SPECIAL_LEAVE => "Bijzonder Verlof",
            PUBLIC_HOLIDAY => "Feestdag",
            FROST_DELAY => "Vorstverlet",
            SINGLE_DAY_LEAVE => "Snipperdag",
            SCHEDULED_FREE => "Roostervrij",
            MEDICAL_APPOINTMENT => "Artsbezoek",
            OTHER_ABSENCE => "Overige Afwezigheid",
            _ => "Onbekend"
        };
    }
}
