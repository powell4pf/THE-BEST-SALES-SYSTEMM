using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Inventory;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/stock")]
[Permission("stock.view")]
public sealed class StockController : ControllerBase
{
    private readonly IStockService _service;

    public StockController(IStockService service) => _service = service;

    [HttpGet("dashboard")]
    public Task<StockDashboardDto> GetDashboard(CancellationToken cancellationToken)
        => _service.GetDashboardAsync(cancellationToken);
}
