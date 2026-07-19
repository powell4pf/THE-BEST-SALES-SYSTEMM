namespace NurturedChoice.Application.DTOs.Customers;

public sealed record BranchDto(
    Guid Id,
    Guid ParentGroupId,
    string BranchName,
    string? Address,
    string? ContactPerson,
    string? Email,
    string? Phone);

