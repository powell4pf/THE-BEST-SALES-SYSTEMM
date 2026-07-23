namespace NurturedChoice.Application.DTOs.Customers;

public sealed record ParentGroupListItemDto(
    Guid Id,
    string CompanyName,
    string? ContactPerson,
    string? Email,
    string? Phone,
    decimal CreditLimit,
    string Status,
    int BranchCount,
    string? Address,
    IReadOnlyList<BranchDto> Branches);

