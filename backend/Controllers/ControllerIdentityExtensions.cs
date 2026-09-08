using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Leest de geverifieerde identiteit van de aanroeper uit HttpContext.Items.
/// Deze waarden worden uitsluitend gezet door MedewGcIdMiddleware na JWT-validatie;
/// client-headers of query/body-parameters worden nooit vertrouwd.
/// </summary>
public static class ControllerIdentityExtensions
{
    public const string UserIdKey = "UserId";
    public const string MedewGcIdKey = "MedewGcId";
    public const string UserRoleKey = "UserRole";

    public static int? CurrentUserId(this HttpContext context)
    {
        return context.Items.TryGetValue(UserIdKey, out var value) && value is int id ? id : null;
    }

    public static int? CurrentMedewGcId(this HttpContext context)
    {
        return context.Items.TryGetValue(MedewGcIdKey, out var value) && value is int id ? id : null;
    }

    public static string CurrentRole(this HttpContext context)
    {
        if (context.Items.TryGetValue(UserRoleKey, out var value) && value is string role && !string.IsNullOrWhiteSpace(role))
        {
            return role.Trim().ToLowerInvariant();
        }
        return "user";
    }

    public static bool IsAdmin(this HttpContext context) => context.CurrentRole() == "admin";

    public static bool IsManagerOrAdmin(this HttpContext context)
    {
        var role = context.CurrentRole();
        return role == "manager" || role == "admin";
    }

    public static int? CurrentUserId(this ControllerBase controller) => controller.HttpContext.CurrentUserId();
    public static int? CurrentMedewGcId(this ControllerBase controller) => controller.HttpContext.CurrentMedewGcId();
    public static string CurrentRole(this ControllerBase controller) => controller.HttpContext.CurrentRole();
    public static bool IsAdmin(this ControllerBase controller) => controller.HttpContext.IsAdmin();
    public static bool IsManagerOrAdmin(this ControllerBase controller) => controller.HttpContext.IsManagerOrAdmin();
}
