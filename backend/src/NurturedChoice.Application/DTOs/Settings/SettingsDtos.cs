namespace NurturedChoice.Application.DTOs.Settings;

public sealed record InvoiceNumberSettingsDto(string Prefix, long StartingNumber, int Padding, string ResetPolicy, bool ManualEditingAllowed);
public sealed record UpdateInvoiceNumberSettingsRequest(string Prefix, long StartingNumber, int Padding, string ResetPolicy, bool ManualEditingAllowed);
public sealed record SystemSettingDto(string Key, string Value, string? Description);
public sealed record UpdateSystemSettingRequest(string Key, string Value);
public sealed record UserRoleDto(Guid Id, string Email, string DisplayName, IReadOnlyList<string> Roles);

public sealed record UpdateUserRoleRequest(string Role);
