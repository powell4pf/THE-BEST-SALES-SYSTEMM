using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Identity;

public class RefreshToken : AuditableEntity
{
    public Guid AppUserId { get; set; }

    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? ReplacedByToken { get; set; }

    public string? CreatedByIp { get; set; }

    public string? RevokedByIp { get; set; }
}

