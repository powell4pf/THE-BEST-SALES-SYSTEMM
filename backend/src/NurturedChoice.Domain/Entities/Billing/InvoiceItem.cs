using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class InvoiceItem : AuditableEntity
{
    public Guid InvoiceId { get; set; }

    public Guid? ProductId { get; set; }

    public string ItemName { get; set; } = string.Empty;

    public string? ItemDescription { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal Discount { get; set; }

    public decimal Tax { get; set; }

    public decimal LineTotal { get; set; }
}

