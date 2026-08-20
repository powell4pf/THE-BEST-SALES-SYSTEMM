using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Settings;

public sealed class Notification : AuditableEntity
{
    public Guid AppUserId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public Guid? DocumentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public DateTime? ReadAt { get; set; }
}
