using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Inventory;
using NurturedChoice.Domain.Entities.Inventory;
using NurturedChoice.Domain.Enums;
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
            select new { product.ProductName, movement.MovementType, movement.Quantity, product.CurrentStock, movement.CreatedAt }
        ).Take(10).ToListAsync(cancellationToken);

        var movementDetails = movements
            .Select(x => new StockMovementDto(
                x.CreatedAt,
                x.ProductName,
                x.MovementType.ToString(),
                x.Quantity,
                x.CurrentStock))
            .ToList();

        return new StockDashboardDto(
        [
            new StockDashboardStatDto("Products", productCount.ToString("N0")),
            new StockDashboardStatDto("Units On Hand", unitsOnHand.ToString("N0")),
            new StockDashboardStatDto("Inventory Value", $"KES {inventoryValue:N0}"),
            new StockDashboardStatDto("Low Stock Alerts", lowStockCount.ToString("N0"))
        ], movementDetails);
    }

    public async Task<PagedResult<StockMovementListItemDto>> GetMovementsAsync(Guid? productId, PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query =
            from movement in _db.StockMovements.AsNoTracking()
            join product in _db.Products.AsNoTracking() on movement.ProductId equals product.Id
            where !movement.IsDeleted && !product.IsDeleted
            select new { movement, product.ProductName };

        if (productId.HasValue)
        {
            query = query.Where(x => x.movement.ProductId == productId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.ProductName.Contains(term) || (x.movement.Notes != null && x.movement.Notes.Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.movement.CreatedAt)
            .Skip(request.Skip)
            .Take(request.PageSize)
            .Select(x => new StockMovementListItemDto(
                x.movement.Id,
                x.movement.CreatedAt,
                x.movement.ProductId,
                x.ProductName,
                x.movement.MovementType.ToString(),
                x.movement.Quantity,
                x.movement.UnitCost,
                x.movement.SourceDocumentType,
                x.movement.Notes))
            .ToListAsync(cancellationToken);

        return new PagedResult<StockMovementListItemDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<StockAdjustmentDto?> CreateAdjustmentAsync(CreateStockAdjustmentRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (request.ProductId == Guid.Empty) throw new ArgumentException("A product is required for a stock adjustment.");
        if (request.AdjustedQuantity < 0) throw new ArgumentOutOfRangeException(nameof(request.AdjustedQuantity), "Stock quantity cannot be negative.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("A reason is required for a stock adjustment.");

        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
            var product = await _db.Products.FirstOrDefaultAsync(x => x.Id == request.ProductId && !x.IsDeleted && x.Status == RecordStatus.Active, cancellationToken);
            if (product is null) return null;

            var previousQuantity = product.CurrentStock;
            var changeQuantity = request.AdjustedQuantity - previousQuantity;
            var now = DateTime.UtcNow;
            var adjustment = new StockAdjustment
            {
                ProductId = product.Id,
                PreviousQuantity = previousQuantity,
                AdjustedQuantity = request.AdjustedQuantity,
                Reason = request.Reason.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
                ApprovedBy = userId,
                CreatedBy = userId,
                CreatedAt = now
            };

            product.CurrentStock = request.AdjustedQuantity;
            product.UpdatedAt = now;
            product.UpdatedBy = userId;

            var balance = await _db.StockBalances.FirstOrDefaultAsync(x => x.ProductId == product.Id && x.BranchId == null && !x.IsDeleted, cancellationToken);
            if (balance is null)
            {
                balance = new StockBalance { ProductId = product.Id, QuantityOnHand = request.AdjustedQuantity, LastReconciledAt = now, CreatedBy = userId, CreatedAt = now };
                _db.StockBalances.Add(balance);
            }
            else
            {
                balance.QuantityOnHand = request.AdjustedQuantity;
                balance.LastReconciledAt = now;
                balance.UpdatedAt = now;
                balance.UpdatedBy = userId;
            }

            _db.StockAdjustments.Add(adjustment);
            _db.StockMovements.Add(new StockMovement
            {
                ProductId = product.Id,
                MovementType = StockMovementType.Adjustment,
                Quantity = changeQuantity,
                UnitCost = product.BuyingPrice,
                SourceDocumentType = "StockAdjustment",
                SourceDocumentId = adjustment.Id,
                Notes = adjustment.Reason,
                CreatedBy = userId,
                CreatedAt = now
            });

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new StockAdjustmentDto(adjustment.Id, product.Id, product.ProductName, previousQuantity, request.AdjustedQuantity, changeQuantity, adjustment.Reason, adjustment.Notes, adjustment.CreatedAt);
        });
    }
}
