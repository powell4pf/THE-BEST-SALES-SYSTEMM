using NurturedChoice.Application.DTOs.Support;

namespace NurturedChoice.Application.Abstractions;

public interface ISupportService
{
    Task<IReadOnlyList<SupportTicketListItemDto>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailsDto?> GetAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailsDto> CreateAsync(CreateSupportTicketRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailsDto?> AddMessageAsync(Guid id, AddSupportTicketMessageRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<SupportTicketDetailsDto?> UpdateAsync(Guid id, UpdateSupportTicketRequest request, Guid userId, CancellationToken cancellationToken = default);
}
