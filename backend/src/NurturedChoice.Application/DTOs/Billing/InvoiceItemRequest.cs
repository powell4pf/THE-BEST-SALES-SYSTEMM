using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Billing;

public sealed record InvoiceItemRequest(
    Guid? ProductId,
    [Required, MaxLength(200)] string ItemName,
    [MaxLength(1000)] string? ItemDescription,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal Tax);

