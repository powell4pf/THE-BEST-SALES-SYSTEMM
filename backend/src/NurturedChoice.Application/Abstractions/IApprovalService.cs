using NurturedChoice.Application.DTOs.Workflow;

namespace NurturedChoice.Application.Abstractions;

public interface IApprovalService
{
    Task<IReadOnlyList<ApprovalRequestDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<Guid> RequestAsync(string requestType, Guid entityId, Guid requestedBy, string? reason, string payloadJson, CancellationToken cancellationToken = default);
    Task<bool> ApproveAsync(Guid id, Guid reviewerId, string? comment, CancellationToken cancellationToken = default);
    Task<bool> RejectAsync(Guid id, Guid reviewerId, string? comment, CancellationToken cancellationToken = default);
}
