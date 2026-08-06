using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Application.Abstractions;

public interface IPaymentService
{
    Task<PagedResult<PaymentListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<Guid> CreateAsync(CreatePaymentRequest request, Guid? userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}
