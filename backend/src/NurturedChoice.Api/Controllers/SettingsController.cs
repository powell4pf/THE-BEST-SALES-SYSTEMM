using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/settings")]
[Permission("settings.manage")]
public sealed class SettingsController : ControllerBase
{
    private readonly ICompanyProfileService _service;
    private readonly ICurrentUserService _currentUser;

    public SettingsController(ICompanyProfileService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("company-profile")]
    public Task<CompanyProfileDto> GetCompanyProfile(CancellationToken cancellationToken)
        => _service.GetAsync(cancellationToken);

    [HttpPut("company-profile")]
    public Task<CompanyProfileDto> UpdateCompanyProfile(UpdateCompanyProfileRequest request, CancellationToken cancellationToken)
        => _service.UpdateAsync(request, _currentUser.UserId, cancellationToken);
}
