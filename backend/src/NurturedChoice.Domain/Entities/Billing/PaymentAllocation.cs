using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class PaymentAllocation : AuditableEntity
{
    public Guid PaymentId { get; set; }

    public Guid? InvoiceId { get; set; }

    public Guid? StatementId { get; set; }

    public decimal Amount { get; set; }
}

