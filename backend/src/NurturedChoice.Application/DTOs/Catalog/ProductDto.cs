namespace NurturedChoice.Application.DTOs.Catalog;

public sealed record ProductDto(
    Guid Id,
    string Sku,
    string? Barcode,
    string ProductName,
    string? Category,
    string? Description,
    decimal BuyingPrice,
    decimal SellingPrice,
    string Unit,
    decimal CurrentStock,
    decimal MinimumStock,
    string Status,
    string? ImageUrl);

