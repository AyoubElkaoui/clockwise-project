using System.Diagnostics;
using ClockwiseProject.Backend;
using ClockwiseProject.Backend.Data;
using ClockwiseProject.Backend.Models;
using Dapper;

namespace backend.Services;

/// <summary>
/// Actuele status van de afhankelijkheden (Firebird/Atrium en PostgreSQL). Wordt gevuld door
/// <see cref="StartupHealthService"/> en gelezen door /api/health.
/// </summary>
public class DependencyStatus
{
    public DateTime StartedAt { get; } = DateTime.UtcNow;
    public bool FirebirdOk { get; set; }
    public string? FirebirdError { get; set; }
    public bool PostgresOk { get; set; }
    public string? PostgresError { get; set; }
    public bool GeneratorsAligned { get; set; }
    public DateTime? LastCheckUtc { get; set; }
    public bool Ready => FirebirdOk && PostgresOk;
}

/// <summary>
/// Controleert bij het opstarten (met herhaling) en daarna elke minuut of Firebird en PostgreSQL
/// bereikbaar zijn, en lijnt eenmalig de Atrium-generators uit zodra Firebird beschikbaar is.
/// De app start altijd; een onbereikbare database wordt zichtbaar via /api/health (503) en in de
/// log, en herstelt vanzelf zodra de database er weer is (bijv. na de nachtelijke herstart).
/// </summary>
public class StartupHealthService : BackgroundService
{
    private readonly FirebirdConnectionFactory _firebird;
    private readonly PostgreSQLConnectionFactory _postgres;
    private readonly SyntessOptions _syntess;
    private readonly DependencyStatus _status;
    private readonly ILogger<StartupHealthService> _logger;

    public StartupHealthService(
        FirebirdConnectionFactory firebird,
        PostgreSQLConnectionFactory postgres,
        SyntessOptions syntess,
        DependencyStatus status,
        ILogger<StartupHealthService> logger)
    {
        _firebird = firebird;
        _postgres = postgres;
        _syntess = syntess;
        _status = status;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var attempt = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            attempt++;
            await CheckPostgresAsync();
            await CheckFirebirdAsync();
            _status.LastCheckUtc = DateTime.UtcNow;

            if (_status.Ready)
            {
                if (attempt == 1) _logger.LogInformation("[startup] Firebird en PostgreSQL bereikbaar - Clockd is klaar");
                else _logger.LogInformation("[health] Verbindingen hersteld na {Attempts} pogingen", attempt);
                await AlignGeneratorsOnceAsync();
                break;
            }

            var delay = TimeSpan.FromSeconds(Math.Min(60, 5 * attempt));
            _logger.LogWarning("[startup] Nog niet klaar (Firebird: {Fb}, PostgreSQL: {Pg}) - nieuwe poging over {Delay}s",
                _status.FirebirdOk ? "ok" : _status.FirebirdError, _status.PostgresOk ? "ok" : _status.PostgresError, delay.TotalSeconds);
            try { await Task.Delay(delay, stoppingToken); } catch (TaskCanceledException) { return; }
        }

        // Periodieke bewaking
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (TaskCanceledException) { return; }
            var wasReady = _status.Ready;
            await CheckPostgresAsync();
            await CheckFirebirdAsync();
            _status.LastCheckUtc = DateTime.UtcNow;
            if (wasReady && !_status.Ready)
                _logger.LogError("[health] Verbinding weggevallen (Firebird: {Fb}, PostgreSQL: {Pg})",
                    _status.FirebirdOk ? "ok" : _status.FirebirdError, _status.PostgresOk ? "ok" : _status.PostgresError);
            else if (!wasReady && _status.Ready)
            {
                _logger.LogInformation("[health] Verbindingen hersteld");
                await AlignGeneratorsOnceAsync();
            }
        }
    }

    private async Task CheckFirebirdAsync()
    {
        try
        {
            using var conn = _firebird.CreateConnection();
            await conn.OpenAsync();
            await conn.ExecuteScalarAsync<int>("SELECT 1 FROM RDB$DATABASE");
            _status.FirebirdOk = true; _status.FirebirdError = null;
        }
        catch (Exception ex)
        {
            _status.FirebirdOk = false; _status.FirebirdError = Short(ex);
        }
    }

    private async Task CheckPostgresAsync()
    {
        try
        {
            using var conn = _postgres.CreateConnection();
            conn.Open();
            await conn.ExecuteScalarAsync<int>("SELECT 1");
            _status.PostgresOk = true; _status.PostgresError = null;
        }
        catch (Exception ex)
        {
            _status.PostgresOk = false; _status.PostgresError = Short(ex);
        }
    }

    /// <summary>
    /// De app deelt GC_ID's uit via de Atrium-generators. Historische MAX+1-inserts kunnen een
    /// generator ACHTER het tabelmaximum hebben gelaten; dan zou GEN_ID een bestaand id opleveren.
    /// Alleen omhoog bijstellen, idempotent, verstoort Syntess niet.
    /// </summary>
    private async Task AlignGeneratorsOnceAsync()
    {
        if (_status.GeneratorsAligned) return;
        try
        {
            using var conn = _firebird.CreateConnection();
            await conn.OpenAsync();
            foreach (var (table, generator) in new[] { ("AT_URENBREG", _syntess.GeneratorUrenbreg), ("AT_DOCUMENT", _syntess.GeneratorDocument) })
            {
                var maxId = await conn.ExecuteScalarAsync<long>($"SELECT COALESCE(MAX(GC_ID), 0) FROM {table}");
                var current = await conn.ExecuteScalarAsync<long>($"SELECT GEN_ID({generator}, 0) FROM RDB$DATABASE");
                if (maxId > current)
                {
                    await conn.ExecuteScalarAsync<long>($"SELECT GEN_ID({generator}, {maxId - current}) FROM RDB$DATABASE");
                    _logger.LogWarning("Generator {Generator} liep achter ({Current}) - opgehoogd naar tabelmaximum ({Max})", generator, current, maxId);
                }
            }
            _status.GeneratorsAligned = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Generator-uitlijning mislukt; wordt opnieuw geprobeerd bij de volgende controle");
        }
    }

    private static string Short(Exception ex)
    {
        var msg = ex.GetBaseException().Message;
        return msg.Length > 200 ? msg[..200] : msg;
    }
}

/// <summary>Controleert de configuratie vóór de app luistert; faalt hard met een duidelijke melding.</summary>
public static class StartupConfigValidator
{
    public static void Validate(IConfiguration config)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(config.GetConnectionString("Firebird")))
            errors.Add("ConnectionStrings:Firebird ontbreekt (env ConnectionStrings__Firebird)");
        var pg = config.GetConnectionString("PostgreSQL");
        if (string.IsNullOrWhiteSpace(pg))
            errors.Add("ConnectionStrings:PostgreSQL ontbreekt (env ConnectionStrings__PostgreSQL)");
        else if (pg.Contains("NEON_PASSWORD", StringComparison.OrdinalIgnoreCase))
            errors.Add("ConnectionStrings:PostgreSQL bevat nog de placeholder NEON_PASSWORD");

        var jwt = config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwt) || jwt.Length < 32 || jwt.StartsWith("YourSuperSecret", StringComparison.OrdinalIgnoreCase))
            errors.Add("Jwt:Key ontbreekt, is korter dan 32 tekens of is nog de placeholder (env Jwt__Key)");

        var tfa = config["TwoFactor:EncryptionKey"];
        if (string.IsNullOrWhiteSpace(tfa) || tfa.Length != 32 || tfa.StartsWith("CHANGE-THIS", StringComparison.OrdinalIgnoreCase))
            errors.Add("TwoFactor:EncryptionKey ontbreekt, is niet exact 32 tekens of is nog de placeholder (env TwoFactor__EncryptionKey)");

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "Clockd kan niet starten, de configuratie is onvolledig:\n - " + string.Join("\n - ", errors) +
                "\nZet de waarden in C:\\Clockd\\clockd.env (zie deploy/clockd.env.example) of als omgevingsvariabelen.");
        }
    }
}
