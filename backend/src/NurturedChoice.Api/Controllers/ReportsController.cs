using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Reports;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reports")]
[Permission("reports.view")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportsService _service;
    public ReportsController(IReportsService service) => _service = service;

    [HttpGet("accounts-receivable-aging")]
    public Task<AccountsReceivableAgingDto> AccountsReceivableAging(CancellationToken cancellationToken) => _service.GetAccountsReceivableAgingAsync(cancellationToken);
}
