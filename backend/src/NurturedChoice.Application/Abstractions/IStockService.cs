using NurturedChoice.Application.DTOs.Inventory;

namespace NurturedChoice.Application.Abstractions;

public interface IStockService
{
    Task<StockDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default);
}
