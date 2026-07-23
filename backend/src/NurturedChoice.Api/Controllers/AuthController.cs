using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Auth;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleSignIn([FromBody] GoogleSignInRequest request, CancellationToken cancellationToken)
    {
        var result = await _authService.SignInWithGoogleAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Ok(result);
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
}
