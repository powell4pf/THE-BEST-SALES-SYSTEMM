using NurturedChoice.Application.DTOs.Auth;

namespace NurturedChoice.Application.Abstractions;

public interface IAuthService
{
    Task<AuthResponse?> SignInWithGoogleAsync(GoogleSignInRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

    Task<AuthResponse?> SignInWithPasswordAsync(LoginRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

    Task<AuthResponse?> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);

    Task<AuthResponse?> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);

    Task<bool> LogoutAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
}
