using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Application.DTOs.Billing;

public sealed record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    string? LpoNumber,
    DateOnly InvoiceDate,
    Guid ParentGroupId,
    Guid BranchId,
    string? Salesperson,
    string? PaymentTerms,
    DateOnly? DueDate,
    decimal DiscountTotal,
    decimal TaxTotal,
    decimal Subtotal,
    decimal GrandTotal,
    string? Notes,
    InvoiceStatus Status,
    IReadOnlyList<InvoiceItemDto> Items);

