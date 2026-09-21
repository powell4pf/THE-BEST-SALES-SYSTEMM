using NurturedChoice.Application.DTOs.Inventory;
using NurturedChoice.Application.Common;

namespace NurturedChoice.Application.Abstractions;

public interface IStockService
{
    Task<StockDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<StockMovementListItemDto>> GetMovementsAsync(Guid? productId, PagedRequest request, CancellationToken cancellationToken = default);
    Task<StockAdjustmentDto?> CreateAdjustmentAsync(CreateStockAdjustmentRequest request, Guid? userId, CancellationToken cancellationToken = default);
}
