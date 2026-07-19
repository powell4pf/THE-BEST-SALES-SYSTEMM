namespace NurturedChoice.Infrastructure.Authentication;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "NurturedChoice";

    public string Audience { get; set; } = "NurturedChoice.Web";

    public string SigningKey { get; set; } = "CHANGE_ME_DEVELOPMENT_ONLY_SIGNING_KEY_32CHARS";

    public int AccessTokenMinutes { get; set; } = 60;

    public int RefreshTokenDays { get; set; } = 30;
}

