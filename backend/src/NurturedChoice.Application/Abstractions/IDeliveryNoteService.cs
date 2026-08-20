using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Application.Abstractions;

public interface IDeliveryNoteService
{
    Task<PagedResult<DeliveryNoteListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<DeliveryNoteDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<string> GetNextNumberAsync(CancellationToken cancellationToken = default);
    Task<Guid> CreateAsync(CreateDeliveryNoteRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Guid id, CreateDeliveryNoteRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}
