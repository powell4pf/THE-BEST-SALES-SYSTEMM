using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
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
    private readonly ICurrentUserService _currentUser;

    public StockController(IStockService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("dashboard")]
    public Task<StockDashboardDto> GetDashboard(CancellationToken cancellationToken)
        => _service.GetDashboardAsync(cancellationToken);

    [HttpGet("movements")]
    public Task<PagedResult<StockMovementListItemDto>> GetMovements([FromQuery] Guid? productId, [FromQuery] PagedRequest request, CancellationToken cancellationToken)
        => _service.GetMovementsAsync(productId, request, cancellationToken);

    [HttpPost("adjustments")]
    [Permission("stock.manage")]
    public async Task<ActionResult<StockAdjustmentDto>> CreateAdjustment([FromBody] CreateStockAdjustmentRequest request, CancellationToken cancellationToken)
    {
        if (request.ProductId == Guid.Empty || request.AdjustedQuantity < 0 || string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new ProblemDetails { Title = "Invalid stock adjustment", Detail = "Choose a product, enter a non-negative quantity, and provide a reason." });
        }

        var adjustment = await _service.CreateAdjustmentAsync(request, _currentUser.UserId, cancellationToken);
        return adjustment is null ? NotFound() : Ok(adjustment);
    }
}
