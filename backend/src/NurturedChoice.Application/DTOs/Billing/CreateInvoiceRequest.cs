using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Billing;

public sealed record CreateInvoiceRequest(
    string? InvoiceNumber,
    [MaxLength(80)] string? LpoNumber,
    DateOnly InvoiceDate,
    Guid ParentGroupId,
    Guid BranchId,
    [MaxLength(150)] string? Salesperson,
    [MaxLength(200)] string? PaymentTerms,
    DateOnly? DueDate,
    [MaxLength(2000)] string? Notes,
    IReadOnlyList<InvoiceItemRequest> Items);

