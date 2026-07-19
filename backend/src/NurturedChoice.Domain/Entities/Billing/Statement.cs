using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Billing;

public class Statement : AuditableEntity
{
    public string StatementNumber { get; set; } = string.Empty;

    public Guid ParentGroupId { get; set; }

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    public decimal OpeningBalance { get; set; }

    public decimal ClosingBalance { get; set; }

    public StatementStatus Status { get; set; } = StatementStatus.Draft;

    public ICollection<StatementLine> Lines { get; set; } = new List<StatementLine>();
}

