using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Domain.Entities.Customers;

namespace NurturedChoice.Domain.Entities.Billing;

public class Invoice : AuditableEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;

    public string? LpoNumber { get; set; }

    public DateOnly InvoiceDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public Guid ParentGroupId { get; set; }

    public Guid BranchId { get; set; }

    public string? Salesperson { get; set; }

    public string? PaymentTerms { get; set; }

    public DateOnly? DueDate { get; set; }

    public decimal DiscountTotal { get; set; }

    public decimal TaxTotal { get; set; }

    public decimal Subtotal { get; set; }

    public decimal GrandTotal { get; set; }

    public string? Notes { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    public ParentGroup? ParentGroup { get; set; }

    public Branch? Branch { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

