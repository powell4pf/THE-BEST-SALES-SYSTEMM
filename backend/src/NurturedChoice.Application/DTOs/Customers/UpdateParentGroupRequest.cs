using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Customers;

public sealed record UpdateParentGroupRequest(
    [Required, MaxLength(200)] string CompanyName,
    [MaxLength(150)] string? ContactPerson,
    [MaxLength(150), EmailAddress] string? Email,
    [MaxLength(50)] string? Phone,
    [MaxLength(300)] string? Address,
    [MaxLength(50)] string? KraPin,
    decimal CreditLimit,
    IReadOnlyList<UpdateBranchRequest>? Branches = null);
