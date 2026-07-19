using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace NurturedChoice.Infrastructure.Authentication;

public sealed class GoogleTokenService
{
    private readonly GoogleAuthOptions _options;

    public GoogleTokenService(IOptions<GoogleAuthOptions> options)
    {
        _options = options.Value;
    }

    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
        {
            throw new InvalidOperationException("GoogleAuth:ClientId is not configured.");
        }

        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [ _options.ClientId ]
        });

        if (!payload.EmailVerified)
        {
            throw new InvalidOperationException("Google account email is not verified.");
        }

        if (string.IsNullOrWhiteSpace(payload.Email) || string.IsNullOrWhiteSpace(payload.Name) || string.IsNullOrWhiteSpace(payload.Subject))
        {
            throw new InvalidOperationException("Google token is missing required profile claims.");
        }

        return new GoogleIdentity(payload.Email, payload.Name, payload.Subject, payload.EmailVerified);
    }
}

