namespace NurturedChoice.Application.Abstractions;

public interface ICurrentUserService
{
    Guid? UserId { get; }

    string? Email { get; }

    string? DisplayName { get; }

    bool IsAuthenticated { get; }
}

