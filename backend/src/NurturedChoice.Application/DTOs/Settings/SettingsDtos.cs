namespace NurturedChoice.Application.DTOs.Settings;

public sealed record InvoiceNumberSettingsDto(string Prefix, long StartingNumber, int Padding, string ResetPolicy, bool ManualEditingAllowed);
public sealed record UpdateInvoiceNumberSettingsRequest(string Prefix, long StartingNumber, int Padding, string ResetPolicy, bool ManualEditingAllowed);
public sealed record SystemSettingDto(string Key, string Value, string? Description);
public sealed record UpdateSystemSettingRequest(string Key, string Value);
public sealed record UserRoleDto(Guid Id, string Email, string DisplayName, IReadOnlyList<string> Roles, string Status, DateTime? LastLoginAt);

public sealed record UpdateUserRoleRequest(string Role);
public sealed record UpdateUserStatusRequest(string Status);
public sealed record SecurityAuditLogDto(Guid Id, Guid? UserId, Guid? TargetUserId, string EventType, string? Email, string? IpAddress, string? UserAgent, string? Details, bool Succeeded, DateTime CreatedAt);
