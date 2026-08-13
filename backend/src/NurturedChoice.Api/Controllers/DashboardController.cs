using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Dashboard;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/dashboard"), Permission("reports.view")]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;
    public DashboardController(IDashboardService service) => _service = service;
    [HttpGet("summary")] public Task<DashboardSummaryDto> Summary(CancellationToken ct) => _service.GetSummaryAsync(ct);
    [HttpGet("period")]
    public async Task<ActionResult<DashboardPeriodDto>> Period([FromQuery] DateOnly startDate, [FromQuery] DateOnly endDate, CancellationToken ct)
    {
        if (startDate == default || endDate == default || endDate < startDate)
            return BadRequest("Choose a valid start and end date.");
        if (endDate.DayNumber - startDate.DayNumber + 1 > 366)
            return BadRequest("Choose a date range of 366 days or less.");
        return Ok(await _service.GetPeriodAsync(startDate, endDate, ct));
    }
    [HttpGet("sales-trend")] public Task<IReadOnlyList<SalesTrendPointDto>> SalesTrend([FromQuery] string range = "6m", CancellationToken ct = default) => _service.GetSalesTrendAsync(range, ct);
    [HttpGet("product-performance")] public Task<IReadOnlyList<ProductPerformanceDto>> ProductPerformance(CancellationToken ct) => _service.GetProductPerformanceAsync(ct);
    [HttpGet("customer-revenue")] public Task<IReadOnlyList<CustomerRevenueDto>> CustomerRevenue(CancellationToken ct) => _service.GetCustomerRevenueAsync(ct);
    [HttpGet("recent-activity")] public Task<IReadOnlyList<RecentActivityItemDto>> RecentActivity(CancellationToken ct) => _service.GetRecentActivityAsync(ct);
}
