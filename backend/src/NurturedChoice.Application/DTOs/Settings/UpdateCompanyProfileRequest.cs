using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Settings;

public sealed record UpdateCompanyProfileRequest(
    [property: Required, MaxLength(200)] string CompanyName,
    [property: EmailAddress, MaxLength(150)] string? Email,
    [property: MaxLength(50)] string? Phone,
    [property: MaxLength(300)] string? Address,
    [property: MaxLength(100)] string? Country,
    [property: Required, StringLength(3, MinimumLength = 3)] string CurrencyCode);
