using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/settings"), Permission("settings.manage")]
public sealed class SystemSettingsController : ControllerBase
{
    private readonly ISettingsService _service; private readonly ICurrentUserService _currentUser;
    public SystemSettingsController(ISettingsService service, ICurrentUserService currentUser) { _service = service; _currentUser = currentUser; }
    [HttpGet("invoice-number")] public Task<InvoiceNumberSettingsDto> GetInvoiceNumber(CancellationToken cancellationToken) => _service.GetInvoiceNumberAsync(cancellationToken);
    [HttpPut("invoice-number")] public Task<InvoiceNumberSettingsDto> UpdateInvoiceNumber(UpdateInvoiceNumberSettingsRequest request, CancellationToken cancellationToken) => _service.UpdateInvoiceNumberAsync(request, _currentUser.UserId, cancellationToken);
    [HttpGet("system")] public Task<IReadOnlyList<SystemSettingDto>> GetSystem(CancellationToken cancellationToken) => _service.GetSystemAsync(cancellationToken);
    [HttpPut("system")] public Task<IReadOnlyList<SystemSettingDto>> UpdateSystem(IReadOnlyList<UpdateSystemSettingRequest> request, CancellationToken cancellationToken) => _service.UpdateSystemAsync(request, _currentUser.UserId, cancellationToken);
}
