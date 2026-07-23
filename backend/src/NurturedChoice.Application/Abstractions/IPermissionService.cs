namespace NurturedChoice.Application.Abstractions;

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(Guid? userId, string permissionKey, CancellationToken cancellationToken = default);
}
