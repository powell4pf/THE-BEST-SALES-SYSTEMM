using NurturedChoice.Application.DTOs.Reports;

namespace NurturedChoice.Application.Abstractions;

public interface ICollectionsService
{
    Task<CollectionsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<bool> UpdateFollowUpAsync(Guid customerId, UpdateCollectionFollowUpRequest request, Guid? userId, CancellationToken cancellationToken = default);
}
