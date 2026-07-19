using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Identity;

public class AppUser : AuditableEntity
{
    public string Email { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? GoogleSubject { get; set; }

    public string? PasswordHash { get; set; }

    public bool IsEmailVerified { get; set; }

    public RecordStatus Status { get; set; } = RecordStatus.Active;

    public ICollection<AppUserRole> UserRoles { get; set; } = new List<AppUserRole>();

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

