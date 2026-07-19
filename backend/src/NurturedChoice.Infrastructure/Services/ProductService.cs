using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Catalog;
using NurturedChoice.Domain.Entities.Catalog;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class ProductService : IProductService
{
    private readonly SalesDbContext _db;

    public ProductService(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<ProductDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _db.Products.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.Sku.Contains(term) || x.ProductName.Contains(term) || (x.Barcode != null && x.Barcode.Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.ProductName)
            .Skip(request.Skip)
            .Take(request.PageSize)
            .Select(x => new ProductDto(
                x.Id,
                x.Sku,
                x.Barcode,
                x.ProductName,
                x.Category,
                x.Description,
                x.BuyingPrice,
                x.SellingPrice,
                x.Unit,
                x.CurrentStock,
                x.MinimumStock,
                x.Status.ToString(),
                x.ImageUrl))
            .ToListAsync(cancellationToken);

        return new PagedResult<ProductDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null
            ? null
            : new ProductDto(entity.Id, entity.Sku, entity.Barcode, entity.ProductName, entity.Category, entity.Description, entity.BuyingPrice, entity.SellingPrice, entity.Unit, entity.CurrentStock, entity.MinimumStock, entity.Status.ToString(), entity.ImageUrl);
    }

    public async Task<Guid> CreateAsync(CreateProductRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = new Product
        {
            Sku = request.Sku.Trim(),
            Barcode = request.Barcode?.Trim(),
            ProductName = request.ProductName.Trim(),
            Category = request.Category?.Trim(),
            Description = request.Description?.Trim(),
            BuyingPrice = request.BuyingPrice,
            SellingPrice = request.SellingPrice,
            Unit = request.Unit.Trim(),
            CurrentStock = request.CurrentStock,
            MinimumStock = request.MinimumStock,
            ImageUrl = request.ImageUrl?.Trim(),
            Status = RecordStatus.Active,
            CreatedBy = userId
        };

        _db.Products.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateProductRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Products.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;

        entity.Sku = request.Sku.Trim();
        entity.Barcode = request.Barcode?.Trim();
        entity.ProductName = request.ProductName.Trim();
        entity.Category = request.Category?.Trim();
        entity.Description = request.Description?.Trim();
        entity.BuyingPrice = request.BuyingPrice;
        entity.SellingPrice = request.SellingPrice;
        entity.Unit = request.Unit.Trim();
        entity.CurrentStock = request.CurrentStock;
        entity.MinimumStock = request.MinimumStock;
        entity.ImageUrl = request.ImageUrl?.Trim();
        entity.UpdatedBy = userId;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Products.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

