namespace NurturedChoice.Application.DTOs.Auth;

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles);

