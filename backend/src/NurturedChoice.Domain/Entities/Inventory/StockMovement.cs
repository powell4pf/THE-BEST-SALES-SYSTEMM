using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Inventory;

public class StockMovement : AuditableEntity
{
    public Guid ProductId { get; set; }

    public Guid? BranchId { get; set; }

    public StockMovementType MovementType { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public string? SourceDocumentType { get; set; }

    public Guid? SourceDocumentId { get; set; }

    public string? Notes { get; set; }
}

