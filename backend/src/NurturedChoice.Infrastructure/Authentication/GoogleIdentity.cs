namespace NurturedChoice.Infrastructure.Authentication;

public sealed record GoogleIdentity(
    string Email,
    string DisplayName,
    string Subject,
    bool EmailVerified);

