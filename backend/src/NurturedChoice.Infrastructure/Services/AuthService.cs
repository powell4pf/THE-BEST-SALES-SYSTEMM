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
    private const int MaxFailedLoginAttempts = 5;
    private static readonly TimeSpan AccountLockDuration = TimeSpan.FromMinutes(15);
    private readonly SalesDbContext _db;
    private readonly TokenService _tokens;
    private readonly GoogleTokenService _googleTokens;
    private readonly IPasswordHashService _passwordHasher;
    private readonly INotificationService _notifications;

    public AuthService(SalesDbContext db, TokenService tokens, GoogleTokenService googleTokens, IPasswordHashService passwordHasher, INotificationService notifications)
    {
        _db = db;
        _tokens = tokens;
        _googleTokens = googleTokens;
        _passwordHasher = passwordHasher;
        _notifications = notifications;
    }

    public async Task<AuthResponse?> SignInWithGoogleAsync(GoogleSignInRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
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
            if (user.Status != RecordStatus.Active) return null;
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
        user.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        AddAudit(user.Id, user.Id, "LoginSucceeded", user.Email, ipAddress, userAgent, "Google sign-in succeeded.", true);
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

    public async Task<AuthResponse?> SignInWithPasswordAsync(LoginRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.AppUsers.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        var now = DateTime.UtcNow;
        if (user is null)
        {
            AddAudit(null, null, "LoginFailed", email, ipAddress, userAgent, "Invalid email or password.", false);
            await _db.SaveChangesAsync(cancellationToken);
            return null;
        }

        if (user.LockedUntil > now)
        {
            AddAudit(user.Id, user.Id, "LoginFailed", user.Email, ipAddress, userAgent, $"Account is locked until {user.LockedUntil:O}.", false);
            await _db.SaveChangesAsync(cancellationToken);
            return null;
        }

        if (user.Status != RecordStatus.Active || string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password))
        {
            user.FailedLoginAttempts++;
            var locked = user.FailedLoginAttempts >= MaxFailedLoginAttempts;
            if (locked) user.LockedUntil = now.Add(AccountLockDuration);
            AddAudit(user.Id, user.Id, "LoginFailed", user.Email, ipAddress, userAgent, locked ? "Account locked after repeated failed login attempts." : "Invalid email or password.", false);
            await _db.SaveChangesAsync(cancellationToken);
            if (locked) await NotifySecurityAdministratorsAsync(user, ipAddress, cancellationToken);
            return null;
        }

        var roles = await ResolveRolesAsync(user, null, cancellationToken);
        user.LastLoginAt = now;
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        AddAudit(user.Id, user.Id, "LoginSucceeded", user.Email, ipAddress, userAgent, "Password sign-in succeeded.", true);
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

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
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
        user.LastLoginAt = DateTime.UtcNow;
        AddAudit(user.Id, user.Id, "UserRegistered", user.Email, ipAddress, userAgent, "User registered and signed in.", true);
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
        if (user.Status != RecordStatus.Active) return null;
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

    public async Task<bool> LogoutAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Token == refreshToken, cancellationToken);
        if (token is null) return false;

        token.RevokedAt = DateTime.UtcNow;
        var user = await _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == token.AppUserId, cancellationToken);
        AddAudit(token.AppUserId, token.AppUserId, "Logout", user?.Email, ipAddress, userAgent, "User signed out.", true);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private void AddAudit(Guid? userId, Guid? targetUserId, string eventType, string? email, string? ipAddress, string? userAgent, string? details, bool succeeded)
    {
        _db.SecurityAuditLogs.Add(new SecurityAuditLog
        {
            UserId = userId,
            TargetUserId = targetUserId,
            EventType = eventType,
            Email = email,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Details = details,
            Succeeded = succeeded,
            CreatedAt = DateTime.UtcNow
        });
    }

    private async Task NotifySecurityAdministratorsAsync(AppUser lockedUser, string? ipAddress, CancellationToken cancellationToken)
    {
        try
        {
            var recipients = await _db.AppUserRoles.AsNoTracking()
                .Join(_db.AppRoles.AsNoTracking(), link => link.AppRoleId, role => role.Id, (link, role) => new { link.AppUserId, role.Name })
                .Where(x => x.Name == "Super Administrator" || x.Name == "Administrator" || x.Name == "CEO")
                .Join(_db.AppUsers.AsNoTracking().Where(user => user.Status == RecordStatus.Active && !user.IsDeleted), x => x.AppUserId, user => user.Id, (x, user) => user.Id)
                .Distinct()
                .ToListAsync(cancellationToken);

            foreach (var recipient in recipients)
            {
                await _notifications.CreateAsync(recipient, "Security", lockedUser.Id, "User account locked", $"{lockedUser.Email} was locked after repeated failed login attempts from {ipAddress ?? "an unknown address"}.", "/audit-log", cancellationToken);
            }
        }
        catch
        {
            // A notification failure must not turn a failed login into a server error.
        }
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
