using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Inventory;

public class StockAdjustment : AuditableEntity
{
    public Guid ProductId { get; set; }

    public Guid? BranchId { get; set; }

    public decimal PreviousQuantity { get; set; }

    public decimal AdjustedQuantity { get; set; }

    public string Reason { get; set; } = string.Empty;

    public Guid? ApprovedBy { get; set; }

    public string? Notes { get; set; }
}

