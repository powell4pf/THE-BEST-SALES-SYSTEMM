using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Identity;

public class AppRolePermission : AuditableEntity
{
    public Guid AppRoleId { get; set; }

    public Guid AppPermissionId { get; set; }
}

