using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Support;

public sealed class SupportTicketMessage : NurturedChoice.Domain.Common.AuditableEntity
{
    public Guid SupportTicketId { get; set; }
    public Guid AppUserId { get; set; }
    public string Body { get; set; } = string.Empty;
    public string MessageType { get; set; } = "Reply";
    public bool IsInternal { get; set; }
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }

    public SupportTicket? SupportTicket { get; set; }
}
