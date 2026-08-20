using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Domain.Entities.Settings;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class NotificationService : INotificationService
{
    private readonly SalesDbContext _db;
    public NotificationService(SalesDbContext db) => _db = db;

    public async Task<IReadOnlyList<NotificationDto>> GetRecentAsync(Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return [];
        return await _db.Set<Notification>().AsNoTracking()
            .Where(x => x.AppUserId == userId.Value && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .Take(30)
            .Select(x => new NotificationDto(x.Id, x.DocumentType, x.DocumentId, x.Title, x.Message, x.Route, x.CreatedAt, x.ReadAt))
            .ToListAsync(cancellationToken);
    }

    public async Task CreateAsync(Guid? userId, string documentType, Guid? documentId, string title, string message, string route, CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return;
        _db.Set<Notification>().Add(new Notification
        {
            AppUserId = userId.Value,
            DocumentType = documentType,
            DocumentId = documentId,
            Title = title,
            Message = message,
            Route = route,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> MarkReadAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return false;
        var notification = await _db.Set<Notification>().FirstOrDefaultAsync(x => x.Id == id && x.AppUserId == userId.Value && !x.IsDeleted, cancellationToken);
        if (notification is null) return false;
        notification.ReadAt ??= DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task MarkAllReadAsync(Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue) return;
        var unread = await _db.Set<Notification>().Where(x => x.AppUserId == userId.Value && !x.IsDeleted && x.ReadAt == null).ToListAsync(cancellationToken);
        if (unread.Count == 0) return;
        var now = DateTime.UtcNow;
        unread.ForEach(notification => notification.ReadAt = now);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
