using Microsoft.AspNetCore.Identity;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Domain.Entities.Identity;

namespace NurturedChoice.Infrastructure.Security;

public sealed class PasswordHashService : IPasswordHashService
{
    private readonly PasswordHasher<AppUser> _hasher = new();

    public string HashPassword(AppUser user, string password) => _hasher.HashPassword(user, password);

    public bool VerifyHashedPassword(AppUser user, string hashedPassword, string providedPassword)
        => _hasher.VerifyHashedPassword(user, hashedPassword, providedPassword) == PasswordVerificationResult.Success;
}

