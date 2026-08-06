using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Application.DTOs.Billing;

public sealed record InvoiceSummaryDto(
    Guid Id,
    string InvoiceNumber,
    string CustomerName,
    string? Branch,
    DateOnly InvoiceDate,
    DateOnly DueDate,
    decimal GrandTotal,
    InvoiceStatus Status,
    decimal AmountDue,
    DateTime CreatedAt
);