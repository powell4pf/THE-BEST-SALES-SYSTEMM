using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/users"), Permission("users.manage")]
public sealed class UsersController : ControllerBase
{
    private readonly SalesDbContext _db;
    public UsersController(SalesDbContext db) => _db = db;
    [HttpGet]
    public async Task<IReadOnlyList<UserRoleDto>> Get(CancellationToken cancellationToken) => await _db.AppUsers.AsNoTracking().Select(user => new UserRoleDto(user.Id, user.Email, user.DisplayName, _db.AppUserRoles.Where(link => link.AppUserId == user.Id).Join(_db.AppRoles, link => link.AppRoleId, role => role.Id, (_, role) => role.Name).ToList())).ToListAsync(cancellationToken);
}
