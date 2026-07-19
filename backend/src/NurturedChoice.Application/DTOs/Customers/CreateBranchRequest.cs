using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Customers;

public sealed record CreateBranchRequest(
    Guid? Id,
    [Required, MaxLength(200)] string BranchName,
    [MaxLength(300)] string? Address,
    [MaxLength(150)] string? ContactPerson,
    [MaxLength(150), EmailAddress] string? Email,
    [MaxLength(50)] string? Phone);
