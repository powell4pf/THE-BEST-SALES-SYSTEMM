using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class PermissionService : IPermissionService
{
    private readonly SalesDbContext _db;

    public PermissionService(SalesDbContext db) => _db = db;

    public Task<bool> HasPermissionAsync(Guid? userId, string permissionKey, CancellationToken cancellationToken = default)
    {
        if (userId is null) return Task.FromResult(false);
        return _db.AppUserRoles.AsNoTracking()
            .Where(userRole => userRole.AppUserId == userId.Value && _db.AppUsers.Any(user => user.Id == userId.Value && user.Status == NurturedChoice.Domain.Enums.RecordStatus.Active && !user.IsDeleted))
            .Join(_db.AppRoles.AsNoTracking(), userRole => userRole.AppRoleId, role => role.Id, (_, role) => role)
            .AnyAsync(role => (role.Name == "Super Administrator" || role.Name == "Administrator" || role.Name == "CEO") || role.RolePermissions.Any(link => _db.AppPermissions.Any(permission => permission.Id == link.AppPermissionId && permission.Key == permissionKey)), cancellationToken);
    }
}
