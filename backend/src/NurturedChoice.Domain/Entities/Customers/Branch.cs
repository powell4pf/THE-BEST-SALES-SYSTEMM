using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Customers;

public class Branch : AuditableEntity
{
    public Guid ParentGroupId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string? ContactPerson { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public ParentGroup? ParentGroup { get; set; }
}

