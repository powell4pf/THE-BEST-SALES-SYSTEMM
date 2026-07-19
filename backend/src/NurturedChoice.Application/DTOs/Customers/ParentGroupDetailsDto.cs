namespace NurturedChoice.Application.DTOs.Customers;

public sealed record ParentGroupDetailsDto(
    Guid Id,
    string CompanyName,
    string? ContactPerson,
    string? Email,
    string? Phone,
    string? Address,
    string? KraPin,
    decimal CreditLimit,
    string Status,
    IReadOnlyList<BranchDto> Branches);

