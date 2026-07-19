using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class InvoiceNumberSequence : AuditableEntity
{
    public string SequenceKey { get; set; } = string.Empty;

    public long CurrentNumber { get; set; }

    public DateOnly? PeriodStart { get; set; }

    public DateOnly? PeriodEnd { get; set; }
}

