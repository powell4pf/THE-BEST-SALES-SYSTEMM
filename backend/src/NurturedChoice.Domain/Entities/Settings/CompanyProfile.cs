using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Settings;

public class CompanyProfile : AuditableEntity
{
    public string CompanyName { get; set; } = string.Empty;

    public string? LogoUrl { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? Country { get; set; }

    public string? CurrencyCode { get; set; } = "KES";

    public bool IsActive { get; set; } = true;
}

