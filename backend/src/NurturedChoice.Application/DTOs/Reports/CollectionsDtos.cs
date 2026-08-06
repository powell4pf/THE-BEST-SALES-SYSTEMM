namespace NurturedChoice.Application.DTOs.Reports;

public sealed record CollectionsOverviewDto(
    DateOnly AsOfDate,
    decimal TotalOutstanding,
    decimal TotalOverdue,
    decimal DueToday,
    decimal DueNext7Days,
    int CustomersWithBalance,
    int CustomersOverdue,
    IReadOnlyList<CollectionCustomerDto> Customers);

public sealed record CollectionCustomerDto(
    Guid CustomerId,
    string CustomerName,
    string? ContactPerson,
    string? Email,
    string? Phone,
    decimal CreditLimit,
    decimal OutstandingBalance,
    decimal CurrentBalance,
    decimal OverdueBalance,
    int OldestDaysOverdue,
    string RiskStatus,
    string FollowUpStatus,
    DateOnly? NextFollowUpDate,
    DateTime? LastContactedAt,
    string? LastContactMethod,
    string? Notes,
    IReadOnlyList<CollectionInvoiceDto> Invoices);

public sealed record CollectionInvoiceDto(
    Guid InvoiceId,
    string InvoiceNumber,
    string? Branch,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    decimal Total,
    decimal Paid,
    decimal Outstanding,
    int DaysOverdue);

public sealed record UpdateCollectionFollowUpRequest(
    string Status,
    DateOnly? NextFollowUpDate,
    string? ContactMethod,
    string? Notes);
