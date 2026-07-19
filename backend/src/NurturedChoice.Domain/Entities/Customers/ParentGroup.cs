using NurturedChoice.Domain.Common;
using NurturedChoice.Domain.Enums;

namespace NurturedChoice.Domain.Entities.Customers;

public class ParentGroup : AuditableEntity
{
    public string CompanyName { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? KraPin { get; set; }

    public decimal CreditLimit { get; set; }

    public RecordStatus Status { get; set; } = RecordStatus.Active;

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}

