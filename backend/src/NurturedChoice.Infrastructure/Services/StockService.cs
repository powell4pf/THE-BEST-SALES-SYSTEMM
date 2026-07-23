using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Inventory;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class StockService : IStockService
{
    private readonly SalesDbContext _db;

    public StockService(SalesDbContext db) => _db = db;

    public async Task<StockDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var products = _db.Products.AsNoTracking().Where(x => !x.IsDeleted);
        var productCount = await products.CountAsync(cancellationToken);
        var unitsOnHand = await products.SumAsync(x => (decimal?)x.CurrentStock, cancellationToken) ?? 0m;
        var inventoryValue = await products.SumAsync(x => (decimal?)(x.CurrentStock * x.BuyingPrice), cancellationToken) ?? 0m;
        var lowStockCount = await products.CountAsync(x => x.CurrentStock <= x.MinimumStock, cancellationToken);

        var movements = await (
            from movement in _db.StockMovements.AsNoTracking()
            join product in _db.Products.AsNoTracking() on movement.ProductId equals product.Id
            where !movement.IsDeleted && !product.IsDeleted
            orderby movement.CreatedAt descending
            select new { product.ProductName, movement.MovementType, movement.Quantity, movement.CreatedAt }
        ).Take(10).ToListAsync(cancellationToken);

        var movementText = movements
            .Select(x => $"{x.CreatedAt:dd MMM yyyy HH:mm} - {x.MovementType}: {x.Quantity:0.###} {x.ProductName}")
            .ToList();

        return new StockDashboardDto(
        [
            new StockDashboardStatDto("Products", productCount.ToString("N0")),
            new StockDashboardStatDto("Units On Hand", unitsOnHand.ToString("N0")),
            new StockDashboardStatDto("Inventory Value", $"KES {inventoryValue:N0}"),
            new StockDashboardStatDto("Low Stock Alerts", lowStockCount.ToString("N0"))
        ], movementText);
    }
}
