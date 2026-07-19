using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Catalog;

public class Product : AuditableEntity
{
    public string Sku { get; set; } = string.Empty;

    public string? Barcode { get; set; }

    public string ProductName { get; set; } = string.Empty;

    public string? Category { get; set; }

    public string? Description { get; set; }

    public decimal BuyingPrice { get; set; }

    public decimal SellingPrice { get; set; }

    public string Unit { get; set; } = "pcs";

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public RecordStatus Status { get; set; } = RecordStatus.Active;

    public string? ImageUrl { get; set; }

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}

