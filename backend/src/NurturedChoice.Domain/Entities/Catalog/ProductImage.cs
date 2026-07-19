using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Catalog;

public class ProductImage : AuditableEntity
{
    public Guid ProductId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public bool IsPrimary { get; set; }

    public Product? Product { get; set; }
}

