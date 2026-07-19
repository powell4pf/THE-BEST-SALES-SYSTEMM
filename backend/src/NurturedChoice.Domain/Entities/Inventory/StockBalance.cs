using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Inventory;

public class StockBalance : AuditableEntity
{
    public Guid ProductId { get; set; }

    public Guid? BranchId { get; set; }

    public decimal QuantityOnHand { get; set; }

    public decimal ReservedQuantity { get; set; }

    public DateTime LastReconciledAt { get; set; } = DateTime.UtcNow;
}

