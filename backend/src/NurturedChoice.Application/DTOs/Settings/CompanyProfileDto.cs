namespace NurturedChoice.Application.DTOs.Settings;

public sealed record CompanyProfileDto(
    Guid Id,
    string CompanyName,
    string? Email,
    string? Phone,
    string? Address,
    string? Country,
    string CurrencyCode,
    string? LogoUrl);
