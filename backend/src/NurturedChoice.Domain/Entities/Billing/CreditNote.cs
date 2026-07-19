using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Billing;

public class CreditNote : AuditableEntity
{
    public string CreditNoteNumber { get; set; } = string.Empty;

    public Guid ParentGroupId { get; set; }

    public Guid? BranchId { get; set; }

    public Guid? InvoiceId { get; set; }

    public DateOnly CreditDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public string? Reason { get; set; }

    public decimal TotalAmount { get; set; }

    public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Draft;

    public ICollection<CreditNoteItem> Items { get; set; } = new List<CreditNoteItem>();
}

