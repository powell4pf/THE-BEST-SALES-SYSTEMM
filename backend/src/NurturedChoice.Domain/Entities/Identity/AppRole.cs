using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Identity;

public class AppRole : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public RecordStatus Status { get; set; } = RecordStatus.Active;

    public ICollection<AppUserRole> UserRoles { get; set; } = new List<AppUserRole>();

    public ICollection<AppRolePermission> RolePermissions { get; set; } = new List<AppRolePermission>();
}

