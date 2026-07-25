using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class SettingsService : ISettingsService
{
    private readonly SalesDbContext _db;
    public SettingsService(SalesDbContext db) => _db = db;

    public async Task<InvoiceNumberSettingsDto> GetInvoiceNumberAsync(CancellationToken cancellationToken = default)
    {
        var value = await _db.InvoiceNumberSettings.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive, cancellationToken) ?? new Domain.Entities.Billing.InvoiceNumberSettings();
        return new(value.Prefix, value.StartingNumber, value.Padding, value.ResetPolicy.ToString(), value.ManualEditingAllowed);
    }

    public async Task<InvoiceNumberSettingsDto> UpdateInvoiceNumberAsync(UpdateInvoiceNumberSettingsRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Prefix) || request.StartingNumber < 0 || request.Padding is < 1 or > 12) throw new InvalidOperationException("Invoice numbering settings are invalid.");
        var value = await _db.InvoiceNumberSettings.FirstOrDefaultAsync(x => x.IsActive, cancellationToken) ?? new Domain.Entities.Billing.InvoiceNumberSettings { IsActive = true, CreatedBy = userId };
        if (!Enum.TryParse<NumberResetPolicy>(request.ResetPolicy, true, out var policy)) throw new InvalidOperationException("Invalid invoice reset policy.");
        value.Prefix = request.Prefix.Trim().ToUpperInvariant(); value.StartingNumber = request.StartingNumber; value.Padding = request.Padding; value.ResetPolicy = policy; value.ManualEditingAllowed = request.ManualEditingAllowed; value.UpdatedBy = userId;
        if (value.Id == Guid.Empty) _db.InvoiceNumberSettings.Add(value);
        await _db.SaveChangesAsync(cancellationToken); return new(value.Prefix, value.StartingNumber, value.Padding, value.ResetPolicy.ToString(), value.ManualEditingAllowed);
    }

    public async Task<IReadOnlyList<SystemSettingDto>> GetSystemAsync(CancellationToken cancellationToken = default) => await _db.SystemSettings.AsNoTracking().OrderBy(x => x.SettingKey).Select(x => new SystemSettingDto(x.SettingKey, x.SettingValue, x.Description)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SystemSettingDto>> UpdateSystemAsync(IReadOnlyList<UpdateSystemSettingRequest> request, Guid? userId, CancellationToken cancellationToken = default)
    {
        foreach (var item in request)
        {
            var setting = await _db.SystemSettings.FirstOrDefaultAsync(x => x.SettingKey == item.Key, cancellationToken);
            if (setting is null) _db.SystemSettings.Add(new Domain.Entities.Settings.SystemSetting { SettingKey = item.Key.Trim(), SettingValue = item.Value, UpdatedBy = userId });
            else { setting.SettingValue = item.Value; setting.UpdatedBy = userId; }
        }
        await _db.SaveChangesAsync(cancellationToken); return await GetSystemAsync(cancellationToken);
    }
}
