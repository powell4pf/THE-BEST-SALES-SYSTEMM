using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Identity;

public class SecurityAuditLog : Entity
{
    public Guid? UserId { get; set; }

    public Guid? TargetUserId { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public string? Details { get; set; }

    public bool Succeeded { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
