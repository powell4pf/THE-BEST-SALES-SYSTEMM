using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Identity;

public class AppPermission : AuditableEntity
{
    public string Key { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<AppRolePermission> RolePermissions { get; set; } = new List<AppRolePermission>();
}

