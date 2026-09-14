using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Support;

public sealed class SupportTicket : NurturedChoice.Domain.Common.AuditableEntity
{
    public string TicketNumber { get; set; } = string.Empty;
    public Guid AppUserId { get; set; }
    public Guid? AssignedToId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Issue";
    public string Priority { get; set; } = "Normal";
    public string Status { get; set; } = "Submitted";
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
