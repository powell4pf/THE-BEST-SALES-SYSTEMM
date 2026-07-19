using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public class StatementLine : AuditableEntity
{
    public Guid StatementId { get; set; }

    public DateOnly TransactionDate { get; set; }

    public string Description { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public decimal Balance { get; set; }

    public string? SourceDocumentType { get; set; }

    public Guid? SourceDocumentId { get; set; }
}

