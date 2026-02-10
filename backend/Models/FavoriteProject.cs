using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

/// <summary>
/// Represents a user's favorite project for quick access in time registration
/// </summary>
[Table("favorite_projects")]
public class FavoriteProject
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [Column("project_gc_id")]
    public int ProjectGcId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for favorite project with enriched project data
/// </summary>
public class FavoriteProjectDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ProjectGcId { get; set; }
    public string? ProjectCode { get; set; }
    public string? ProjectName { get; set; }
    public string? ProjectGroupName { get; set; }
    public string? CompanyName { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to add a favorite project
/// </summary>
public class AddFavoriteRequest
{
    [Required]
    public int ProjectGcId { get; set; }
}
