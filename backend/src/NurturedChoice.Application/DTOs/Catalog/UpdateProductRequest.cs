using System.ComponentModel.DataAnnotations;

namespace NurturedChoice.Application.DTOs.Catalog;

public sealed record UpdateProductRequest(
    [Required, MaxLength(80)] string Sku,
    [MaxLength(80)] string? Barcode,
    [Required, MaxLength(200)] string ProductName,
    [MaxLength(120)] string? Category,
    [MaxLength(1000)] string? Description,
    decimal BuyingPrice,
    decimal SellingPrice,
    [Required, MaxLength(40)] string Unit,
    decimal CurrentStock,
    decimal MinimumStock,
    [MaxLength(500)] string? ImageUrl);

