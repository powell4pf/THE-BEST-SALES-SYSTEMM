using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Settings;

public sealed record UpdateCompanyProfileRequest(
    [Required, MaxLength(200)] string CompanyName,
    [EmailAddress, MaxLength(150)] string? Email,
    [MaxLength(50)] string? Phone,
    [MaxLength(300)] string? Address,
    [MaxLength(100)] string? Country,
    [Required, StringLength(3, MinimumLength = 3)] string CurrencyCode);
