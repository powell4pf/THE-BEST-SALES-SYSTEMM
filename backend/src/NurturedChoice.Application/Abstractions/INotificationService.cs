using NurturedChoice.Application.DTOs.Settings;

namespace NurturedChoice.Application.Abstractions;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetRecentAsync(Guid? userId, CancellationToken cancellationToken = default);
    Task CreateAsync(Guid? userId, string documentType, Guid? documentId, string title, string message, string route, CancellationToken cancellationToken = default);
    Task<bool> MarkReadAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(Guid? userId, CancellationToken cancellationToken = default);
}
