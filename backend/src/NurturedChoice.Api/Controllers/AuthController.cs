using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Auth;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[EnableRateLimiting("auth")]
[Route("api/v1/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly SalesDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AuthController(IAuthService authService, SalesDbContext db, ICurrentUserService currentUser)
    {
        _authService = authService;
        _db = db;
        _currentUser = currentUser;
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleSignIn([FromBody] GoogleSignInRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SignInWithGoogleAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? Unauthorized() : Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SignInWithPasswordAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? Unauthorized() : Ok(result);
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (request.Password != request.ConfirmPassword)
        {
            return BadRequest(new { title = "Passwords do not match." });
        }

        var result = await _authService.RegisterAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? Conflict(new { title = "An account with that email already exists." }) : Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] string refreshToken, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshAsync(refreshToken, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? Unauthorized() : Ok(result);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] string refreshToken, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(refreshToken, cancellationToken);
        return NoContent();
    }

    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null) return Unauthorized();
        var user = await _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value && x.Status == NurturedChoice.Domain.Enums.RecordStatus.Active, cancellationToken);
        if (user is null) return Unauthorized();
        var roles = await _db.AppUserRoles
            .Where(link => link.AppUserId == user.Id)
            .Join(_db.AppRoles, link => link.AppRoleId, role => role.Id, (_, role) => role.Name)
            .ToListAsync(cancellationToken);
        return Ok(new { userId = user.Id, user.Email, user.DisplayName, roles });
    }
}
