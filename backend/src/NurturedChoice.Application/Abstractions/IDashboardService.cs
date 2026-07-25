using NurturedChoice.Application.DTOs.Dashboard;

namespace NurturedChoice.Application.Abstractions;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SalesTrendPointDto>> GetSalesTrendAsync(string range, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductPerformanceDto>> GetProductPerformanceAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerRevenueDto>> GetCustomerRevenueAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(CancellationToken cancellationToken = default);
}
