using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Application.Abstractions;

public interface IStatementService
{
    Task<StatementDto> GenerateAsync(Guid customerId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
}
