using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Domain.Entities.Identity;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/users"), Permission("users.manage")]
public sealed class UsersController : ControllerBase
{
    private readonly SalesDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    public UsersController(SalesDbContext db, ICurrentUserService currentUser, INotificationService notifications) { _db = db; _currentUser = currentUser; _notifications = notifications; }
    [HttpGet]
    public async Task<IReadOnlyList<UserRoleDto>> Get(CancellationToken cancellationToken) => await _db.AppUsers.AsNoTracking().Select(user => new UserRoleDto(user.Id, user.Email, user.DisplayName, _db.AppUserRoles.Where(link => link.AppUserId == user.Id).Join(_db.AppRoles, link => link.AppRoleId, role => role.Id, (_, role) => role.Name).ToList())).ToListAsync(cancellationToken);

    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        var canManageRoles = _currentUser.UserId is not null && await _db.AppUserRoles
            .Where(link => link.AppUserId == _currentUser.UserId.Value)
            .Join(_db.AppRoles, link => link.AppRoleId, role => role.Id, (_, role) => role.Name)
            .AnyAsync(name => name == "Super Administrator", cancellationToken);
        if (!canManageRoles) return Forbid();

        var roleName = request.Role?.Trim();
        var role = await _db.AppRoles.FirstOrDefaultAsync(x => x.Name == roleName && x.Status == RecordStatus.Active, cancellationToken);
        if (role is null) return BadRequest(new ProblemDetails { Title = "Invalid role", Detail = "Choose one of the available roles." });
        if (id == _currentUser.UserId && role.Name != "Super Administrator")
        {
            return BadRequest(new ProblemDetails { Title = "Super Administrator protection", Detail = "The active Super Administrator cannot remove that role from their own account." });
        }
        if (role.Name != "Super Administrator")
        {
            var currentTargetIsSuperAdministrator = await _db.AppUserRoles
                .Where(link => link.AppUserId == id)
                .Join(_db.AppRoles, link => link.AppRoleId, existingRole => existingRole.Id, (_, existingRole) => existingRole.Name)
                .AnyAsync(name => name == "Super Administrator", cancellationToken);
            var superAdministratorCount = await _db.AppUserRoles
                .Join(_db.AppRoles, link => link.AppRoleId, existingRole => existingRole.Id, (_, existingRole) => existingRole.Name)
                .CountAsync(name => name == "Super Administrator", cancellationToken);
            if (currentTargetIsSuperAdministrator && superAdministratorCount <= 1)
            {
                return BadRequest(new ProblemDetails { Title = "Super Administrator protection", Detail = "At least one Super Administrator must remain assigned to the system." });
            }
        }

        var user = await _db.AppUsers.FirstOrDefaultAsync(x => x.Id == id && x.Status == RecordStatus.Active, cancellationToken);
        if (user is null) return NotFound();

        var existingRoles = await _db.AppUserRoles.Where(link => link.AppUserId == id).ToListAsync(cancellationToken);
        _db.AppUserRoles.RemoveRange(existingRoles);
        _db.AppUserRoles.Add(new AppUserRole { AppUserId = id, AppRoleId = role.Id });
        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.CreateAsync(user.Id, "User", user.Id, "User role changed", $"Your system role is now {role.Name}.", "/settings", cancellationToken);
        return NoContent();
    }
}
