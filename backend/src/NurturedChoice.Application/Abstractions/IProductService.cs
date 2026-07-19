using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Catalog;

namespace NurturedChoice.Application.Abstractions;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);

    Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Guid> CreateAsync(CreateProductRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(Guid id, UpdateProductRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}

