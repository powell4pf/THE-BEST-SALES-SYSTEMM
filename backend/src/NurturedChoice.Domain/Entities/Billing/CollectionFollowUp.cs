using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Billing;

public sealed class CollectionFollowUp : AuditableEntity
{
    public Guid ParentGroupId { get; set; }
    public string Status { get; set; } = "Not contacted";
    public DateOnly? NextFollowUpDate { get; set; }
    public DateTime? LastContactedAt { get; set; }
    public string? LastContactMethod { get; set; }
    public string? Notes { get; set; }
}
