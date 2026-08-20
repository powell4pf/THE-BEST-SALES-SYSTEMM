using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Billing;

public class DeliveryNote : AuditableEntity
{
    public string DeliveryNoteNumber { get; set; } = string.Empty;
    public Guid ParentGroupId { get; set; }
    public Guid? BranchId { get; set; }
    public DateOnly DeliveryDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public string? Notes { get; set; }
    public DeliveryNoteStatus Status { get; set; } = DeliveryNoteStatus.Draft;
    public ICollection<DeliveryNoteItem> Items { get; set; } = new List<DeliveryNoteItem>();
}
