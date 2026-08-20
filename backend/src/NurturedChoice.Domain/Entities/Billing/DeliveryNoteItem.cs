using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class DeliveryNoteItem : AuditableEntity
{
    public Guid DeliveryNoteId { get; set; }
    public Guid? ProductId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}
