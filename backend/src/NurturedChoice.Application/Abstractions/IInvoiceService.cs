using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Application.Abstractions;

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);

    Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Guid> CreateDraftAsync(CreateInvoiceRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> FinalizeAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}

