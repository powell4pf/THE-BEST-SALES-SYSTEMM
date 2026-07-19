using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class Payment : AuditableEntity
{
    public Guid ParentGroupId { get; set; }

    public Guid? BranchId { get; set; }

    public DateOnly PaymentDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public decimal Amount { get; set; }

    public string Method { get; set; } = string.Empty;

    public string? Reference { get; set; }

    public string? Notes { get; set; }

    public ICollection<PaymentAllocation> Allocations { get; set; } = new List<PaymentAllocation>();
}

