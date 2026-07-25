using NurturedChoice.Application.DTOs.Settings;

namespace NurturedChoice.Application.Abstractions;

public interface ISettingsService
{
    Task<InvoiceNumberSettingsDto> GetInvoiceNumberAsync(CancellationToken cancellationToken = default);
    Task<InvoiceNumberSettingsDto> UpdateInvoiceNumberAsync(UpdateInvoiceNumberSettingsRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SystemSettingDto>> GetSystemAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SystemSettingDto>> UpdateSystemAsync(IReadOnlyList<UpdateSystemSettingRequest> request, Guid? userId, CancellationToken cancellationToken = default);
}
