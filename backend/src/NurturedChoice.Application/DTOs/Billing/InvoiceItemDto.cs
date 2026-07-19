namespace NurturedChoice.Application.DTOs.Billing;

public sealed record InvoiceItemDto(
    Guid Id,
    Guid InvoiceId,
    Guid? ProductId,
    string ItemName,
    string? ItemDescription,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal Tax,
    decimal LineTotal);

