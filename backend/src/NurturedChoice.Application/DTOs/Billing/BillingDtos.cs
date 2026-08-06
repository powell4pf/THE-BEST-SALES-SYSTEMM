namespace NurturedChoice.Application.DTOs.Billing;

// Request for creating/updating an invoice
// Note: This record was previously in a separate file CreateInvoiceRequest.cs
// It has been consolidated here and updated to use CreateInvoiceItemRequest.
public record CreateInvoiceRequest(
    string? InvoiceNumber,
    string? LpoNumber,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    Guid ParentGroupId,
    Guid BranchId,
    string? Salesperson,
    string? PaymentTerms,
    string? Notes,
    IReadOnlyList<CreateInvoiceItemRequest> Items
);

// Note: This record was previously in a separate file InvoiceItemRequest.cs
// It has been consolidated here and updated to remove Discount and Tax.
public record CreateInvoiceItemRequest(
    Guid? ProductId,
    string ItemName,
    string? ItemDescription,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal Tax
);

// DTO for displaying detailed invoice information
public record InvoiceDetailsDto(
    Guid Id,
    string InvoiceNumber,
    string? LpoNumber,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    Guid ParentGroupId,
    Guid BranchId,
    string? Salesperson,
    string? PaymentTerms,
    string? Notes,
    IReadOnlyList<InvoiceItemDto> Items,
    decimal Subtotal,
    decimal GrandTotal
);

// Note: This record was previously in a separate file InvoiceItemDto.cs
// It has been consolidated here and updated to remove Discount and Tax.
public record InvoiceItemDto(Guid Id, Guid? InvoiceId, Guid? ProductId, string ItemName, string? ItemDescription, decimal Quantity, decimal UnitPrice, decimal Discount, decimal Tax, decimal LineTotal);
