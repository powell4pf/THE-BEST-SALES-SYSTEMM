using NurturedChoice.Domain.Entities.Identity;

namespace NurturedChoice.Domain.Entities.Settings;

public class MonthEndReminder : AuditableEntity
{
    public Guid AppUserId { get; set; }
    public string PeriodKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? ReadAt { get; set; }
    public AppUser? AppUser { get; set; }
}
