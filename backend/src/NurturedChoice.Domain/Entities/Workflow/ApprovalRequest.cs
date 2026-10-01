using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Workflow;

public sealed class ApprovalRequest : AuditableEntity
{
    public string RequestType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public Guid RequestedBy { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Reason { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? DecisionComment { get; set; }
}
