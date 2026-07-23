using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Auth;
using NurturedChoice.Infrastructure.Authentication;
using NurturedChoice.Domain.Entities.Identity;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class AuthService : IAuthService
{
    private readonly SalesDbContext _db;
    private readonly TokenService _tokens;
    private readonly GoogleTokenService _googleTokens;
    private readonly IPasswordHashService _passwordHasher;

    public AuthService(SalesDbContext db, TokenService tokens, GoogleTokenService googleTokens, IPasswordHashService passwordHasher)
    {
        _db = db;
        _tokens = tokens;
        _googleTokens = googleTokens;
        _passwordHasher = passwordHasher;
    }

    public async Task<AuthResponse> SignInWithGoogleAsync(GoogleSignInRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var identity = await _googleTokens.ValidateAsync(request.IdToken, cancellationToken);
        var user = await _db.AppUsers.FirstOrDefaultAsync(
            x => x.Email == identity.Email || x.GoogleSubject == identity.Subject,
            cancellationToken);

        if (user is null)
        {
            user = new AppUser
            {
                Email = identity.Email.Trim(),
                DisplayName = identity.DisplayName.Trim(),
                GoogleSubject = identity.Subject,
                PhoneNumber = request.PhoneNumber?.Trim(),
                IsEmailVerified = identity.EmailVerified,
                Status = RecordStatus.Active
            };
            _db.AppUsers.Add(user);
        }
        else
        {
            if (!string.Equals(user.GoogleSubject, identity.Subject, StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(user.GoogleSubject))
            {
                throw new InvalidOperationException("Google account does not match the linked user.");
            }

            user.Email = identity.Email.Trim();
            user.DisplayName = identity.DisplayName.Trim();
            user.GoogleSubject = identity.Subject;
            user.PhoneNumber = request.PhoneNumber?.Trim();
            user.IsEmailVerified = identity.EmailVerified;
        }

        var roles = await ResolveRolesAsync(user, null, cancellationToken);
        var accessToken = _tokens.CreateAccessToken(user, roles);
        var refreshToken = _tokens.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            AppUserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress
        });

        await _db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken.Token, refreshToken, accessToken.ExpiresAtUtc, user.Id, user.Email, user.DisplayName, roles);
    }

    public async Task<AuthResponse?> SignInWithPasswordAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.AppUsers.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password))
        {
            return null;
        }

        var roles = await ResolveRolesAsync(user, null, cancellationToken);
        var accessToken = _tokens.CreateAccessToken(user, roles);
        var refreshToken = _tokens.CreateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            AppUserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress
        });

        await _db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken.Token, refreshToken, accessToken.ExpiresAtUtc, user.Id, user.Email, user.DisplayName, roles);
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.AppUsers.AnyAsync(x => x.Email == email, cancellationToken))
        {
            return null;
        }

        var user = new AppUser
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            PasswordHash = string.Empty,
            IsEmailVerified = false,
            Status = RecordStatus.Active
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _db.AppUsers.Add(user);

        var roles = await ResolveRolesAsync(user, "Viewer", cancellationToken);
        var accessToken = _tokens.CreateAccessToken(user, roles);
        var refreshToken = _tokens.CreateRefreshToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            AppUserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress
        });

        await _db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken.Token, refreshToken, accessToken.ExpiresAtUtc, user.Id, user.Email, user.DisplayName, roles);
    }

    public async Task<AuthResponse?> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(x => x.Token == refreshToken && x.RevokedAt == null && x.ExpiresAt > DateTime.UtcNow, cancellationToken);

        if (token is null)
        {
            return null;
        }

        var user = await _db.AppUsers.FirstAsync(x => x.Id == token.AppUserId, cancellationToken);
        var roles = await ResolveRolesAsync(user, null, cancellationToken);
        var accessToken = _tokens.CreateAccessToken(user, roles);
        var nextRefreshToken = _tokens.CreateRefreshToken();

        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ipAddress;
        token.ReplacedByToken = nextRefreshToken;

        _db.RefreshTokens.Add(new RefreshToken
        {
            AppUserId = user.Id,
            Token = nextRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedByIp = ipAddress
        });

        await _db.SaveChangesAsync(cancellationToken);
        return new AuthResponse(accessToken.Token, nextRefreshToken, accessToken.ExpiresAtUtc, user.Id, user.Email, user.DisplayName, roles);
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Token == refreshToken, cancellationToken);
        if (token is null) return false;

        token.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<IReadOnlyList<string>> ResolveRolesAsync(AppUser user, string? requestedRole, CancellationToken cancellationToken)
    {
        var roles = await _db.AppUserRoles
            .Where(x => x.AppUserId == user.Id)
            .Join(_db.AppRoles, userRole => userRole.AppRoleId, role => role.Id, (_, role) => role.Name)
            .ToListAsync(cancellationToken);

        if (roles.Count == 0)
        {
            var fallbackRole = string.IsNullOrWhiteSpace(requestedRole) ? "Viewer" : requestedRole.Trim();
            var roleEntity = await _db.AppRoles.FirstOrDefaultAsync(x => x.Name == fallbackRole, cancellationToken);
            if (roleEntity is null)
            {
                roleEntity = new AppRole { Name = fallbackRole, Status = RecordStatus.Active };
                _db.AppRoles.Add(roleEntity);
                await _db.SaveChangesAsync(cancellationToken);
            }

            var membership = await _db.AppUserRoles.AnyAsync(x => x.AppUserId == user.Id && x.AppRoleId == roleEntity.Id, cancellationToken);
            if (!membership)
            {
                _db.AppUserRoles.Add(new AppUserRole { AppUserId = user.Id, AppRoleId = roleEntity.Id });
                await _db.SaveChangesAsync(cancellationToken);
            }

            roles = [roleEntity.Name];
        }

        return roles;
    }
}
