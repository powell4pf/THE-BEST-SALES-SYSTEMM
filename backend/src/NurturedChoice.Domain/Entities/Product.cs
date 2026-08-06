namespace NurturedChoice.Domain.Entities;

public class Product : AuditableEntity
{
    public Guid Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal PurchasePrice { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; }

    // Placeholder for other properties like category, description, etc.
}