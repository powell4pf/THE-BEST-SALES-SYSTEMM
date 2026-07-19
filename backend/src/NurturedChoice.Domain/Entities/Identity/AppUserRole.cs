using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Identity;

public class AppUserRole : AuditableEntity
{
    public Guid AppUserId { get; set; }

    public Guid AppRoleId { get; set; }
}

