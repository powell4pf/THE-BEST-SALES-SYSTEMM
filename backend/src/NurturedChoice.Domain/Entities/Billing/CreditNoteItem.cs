using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class CreditNoteItem : AuditableEntity
{
    public Guid CreditNoteId { get; set; }

    public Guid? ProductId { get; set; }

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }
}

