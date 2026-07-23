using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Application.Abstractions;

public interface ICreditNoteService
{
    Task<PagedResult<CreditNoteListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<CreditNoteDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<string> GetNextNumberAsync(CancellationToken cancellationToken = default);
    Task<Guid> CreateAsync(CreateCreditNoteRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Guid id, CreateCreditNoteRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}
