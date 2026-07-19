using NurturedChoice.Domain.Entities.Identity;

namespace NurturedChoice.Application.Abstractions;

public interface IPasswordHashService
{
    string HashPassword(AppUser user, string password);

    bool VerifyHashedPassword(AppUser user, string hashedPassword, string providedPassword);
}

