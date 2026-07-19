using NurturedChoice.Domain.Common;

namespace NurturedChoice.Domain.Entities.Settings;

public class SystemSetting : AuditableEntity
{
    public string SettingKey { get; set; } = string.Empty;

    public string SettingValue { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsSensitive { get; set; }
}

