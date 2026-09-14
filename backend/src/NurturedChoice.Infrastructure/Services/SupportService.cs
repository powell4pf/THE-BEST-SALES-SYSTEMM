using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Support;
using NurturedChoice.Domain.Entities.Support;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class SupportService : ISupportService
{
    private static readonly string[] Statuses = ["Submitted", "Acknowledged", "In Progress", "Waiting for Client", "Resolved", "Closed"];
    private static readonly string[] Priorities = ["Low", "Normal", "High", "Urgent"];
    private static readonly string[] Categories = ["Issue", "Feature Request", "Complaint", "Question"];

    private readonly SalesDbContext _db;
    private readonly IPermissionService _permissions;
    private readonly INotificationService _notifications;

    public SupportService(SalesDbContext db, IPermissionService permissions, INotificationService notifications)
    {
        _db = db;
        _permissions = permissions;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<SupportTicketListItemDto>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var canManage = await CanManageAsync(userId, cancellationToken);
        var query = _db.SupportTickets.AsNoTracking().Where(ticket => !ticket.IsDeleted);
        if (!canManage) query = query.Where(ticket => ticket.AppUserId == userId);

        var tickets = await query
            .OrderByDescending(ticket => ticket.LastActivityAt)
            .Select(ticket => new SupportTicketListItemDto(
                ticket.Id,
                ticket.TicketNumber,
                ticket.Subject,
                ticket.Category,
                ticket.Priority,
                ticket.Status,
                _db.AppUsers.Where(user => user.Id == ticket.AppUserId).Select(user => user.DisplayName).FirstOrDefault() ?? "User",
                ticket.CreatedAt,
                ticket.LastActivityAt,
                ticket.Messages.Count(message => !message.IsDeleted && (canManage || !message.IsInternal)),
                ticket.Messages.Where(message => !message.IsDeleted && (canManage || !message.IsInternal)).OrderByDescending(message => message.CreatedAt).Select(message => message.Body).FirstOrDefault()))
            .ToListAsync(cancellationToken);

        return tickets;
    }

    public async Task<SupportTicketDetailsDto?> GetAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var ticket = await _db.SupportTickets.AsNoTracking()
            .Include(item => item.Messages.Where(message => !message.IsDeleted))
            .FirstOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);
        if (ticket is null || (!await CanManageAsync(userId, cancellationToken) && ticket.AppUserId != userId)) return null;

        var canManage = await CanManageAsync(userId, cancellationToken);
        var messages = await MapMessagesAsync(ticket.Messages.Where(message => canManage || !message.IsInternal), cancellationToken);
        return await MapDetailsAsync(ticket, messages, cancellationToken);
    }

    public async Task<SupportTicketDetailsDto> CreateAsync(CreateSupportTicketRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var subject = Clean(request.Subject, 180, "Subject");
        var description = Clean(request.Description, 5000, "Description");
        var category = ValidateChoice(request.Category, Categories, "category");
        var priority = ValidateChoice(request.Priority, Priorities, "priority");
        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            TicketNumber = $"TKT-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            AppUserId = userId,
            Subject = subject,
            Description = description,
            Category = category,
            Priority = priority,
            Status = "Submitted",
            CreatedAt = now,
            CreatedBy = userId,
            LastActivityAt = now
        };
        ticket.Messages.Add(new SupportTicketMessage
        {
            SupportTicketId = ticket.Id,
            AppUserId = userId,
            Body = "Ticket submitted.",
            MessageType = "StatusChanged",
            NewStatus = "Submitted",
            CreatedAt = now,
            CreatedBy = userId
        });
        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync(cancellationToken);

        await NotifyManagersAsync(ticket, $"New support ticket {ticket.TicketNumber}", $"{subject} was submitted.", cancellationToken);
        return (await GetAsync(ticket.Id, userId, cancellationToken))!;
    }

    public async Task<SupportTicketDetailsDto?> AddMessageAsync(Guid id, AddSupportTicketMessageRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);
        if (ticket is null) return null;
        var canManage = await CanManageAsync(userId, cancellationToken);
        if (!canManage && ticket.AppUserId != userId) return null;

        var body = Clean(request.Body, 5000, "Message");
        var isInternal = canManage && request.Internal;
        var now = DateTime.UtcNow;
        _db.SupportTicketMessages.Add(new SupportTicketMessage
        {
            SupportTicketId = ticket.Id,
            AppUserId = userId,
            Body = body,
            MessageType = isInternal ? "InternalNote" : "Reply",
            IsInternal = isInternal,
            CreatedAt = now,
            CreatedBy = userId
        });
        ticket.LastActivityAt = now;
        ticket.UpdatedAt = now;
        ticket.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);

        if (canManage && !isInternal)
        {
            await _notifications.CreateAsync(ticket.AppUserId, "Support", ticket.Id, "Support ticket update", $"There is a new response on {ticket.TicketNumber}.", "/support", cancellationToken);
        }
        else if (!canManage)
        {
            await NotifyManagersAsync(ticket, $"Client replied to {ticket.TicketNumber}", $"There is a new response on {ticket.Subject}.", cancellationToken);
        }

        return await GetAsync(ticket.Id, userId, cancellationToken);
    }

    public async Task<SupportTicketDetailsDto?> UpdateAsync(Guid id, UpdateSupportTicketRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        if (!await CanManageAsync(userId, cancellationToken)) return null;
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(item => item.Id == id && !item.IsDeleted, cancellationToken);
        if (ticket is null) return null;
        var status = ValidateChoice(request.Status, Statuses, "status");
        var priority = ValidateChoice(request.Priority, Priorities, "priority");
        var oldStatus = ticket.Status;
        var now = DateTime.UtcNow;
        ticket.Status = status;
        ticket.Priority = priority;
        ticket.AssignedToId = request.AssignedToId;
        ticket.LastActivityAt = now;
        ticket.UpdatedAt = now;
        ticket.UpdatedBy = userId;
        if (!string.Equals(oldStatus, status, StringComparison.Ordinal))
        {
            _db.SupportTicketMessages.Add(new SupportTicketMessage
            {
                SupportTicketId = ticket.Id,
                AppUserId = userId,
                Body = $"Status changed from {oldStatus} to {status}.",
                MessageType = "StatusChanged",
                PreviousStatus = oldStatus,
                NewStatus = status,
                CreatedAt = now,
                CreatedBy = userId
            });
        }
        await _db.SaveChangesAsync(cancellationToken);
        await _notifications.CreateAsync(ticket.AppUserId, "Support", ticket.Id, $"Ticket {status}", $"Your support ticket {ticket.TicketNumber} is now {status}.", "/support", cancellationToken);
        return await GetAsync(ticket.Id, userId, cancellationToken);
    }

    private async Task<bool> CanManageAsync(Guid userId, CancellationToken cancellationToken) => await _permissions.HasPermissionAsync(userId, "support.manage", cancellationToken);

    private async Task NotifyManagersAsync(SupportTicket ticket, string title, string message, CancellationToken cancellationToken)
    {
        var managerIds = await _db.AppUserRoles.AsNoTracking()
            .Join(_db.AppRoles.AsNoTracking(), link => link.AppRoleId, role => role.Id, (link, role) => new { link.AppUserId, role.Name })
            .Where(item => item.Name == "Super Administrator" || item.Name == "Administrator" || item.Name == "CEO")
            .Join(_db.AppUsers.AsNoTracking().Where(user => user.Status == Domain.Enums.RecordStatus.Active && !user.IsDeleted), item => item.AppUserId, user => user.Id, (item, _) => item.AppUserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        foreach (var managerId in managerIds)
        {
            await _notifications.CreateAsync(managerId, "Support", ticket.Id, title, message, "/support", cancellationToken);
        }
    }

    private async Task<SupportTicketDetailsDto> MapDetailsAsync(SupportTicket ticket, IReadOnlyList<SupportTicketMessageDto> messages, CancellationToken cancellationToken)
    {
        var submittedBy = await _db.AppUsers.AsNoTracking().Where(user => user.Id == ticket.AppUserId).Select(user => user.DisplayName).FirstOrDefaultAsync(cancellationToken) ?? "User";
        return new SupportTicketDetailsDto(ticket.Id, ticket.TicketNumber, ticket.Subject, ticket.Description, ticket.Category, ticket.Priority, ticket.Status, ticket.AppUserId, submittedBy, ticket.AssignedToId, ticket.CreatedAt, ticket.LastActivityAt, messages);
    }

    private async Task<IReadOnlyList<SupportTicketMessageDto>> MapMessagesAsync(IEnumerable<SupportTicketMessage> messages, CancellationToken cancellationToken)
    {
        var materialized = messages.OrderBy(message => message.CreatedAt).ToList();
        var authorIds = materialized.Select(message => message.AppUserId).Distinct().ToArray();
        var authors = await _db.AppUsers.AsNoTracking().Where(user => authorIds.Contains(user.Id)).ToDictionaryAsync(user => user.Id, user => user.DisplayName, cancellationToken);
        return materialized.Select(message => new SupportTicketMessageDto(message.Id, message.AppUserId, authors.GetValueOrDefault(message.AppUserId, "User"), message.Body, message.MessageType, message.IsInternal, message.PreviousStatus, message.NewStatus, message.CreatedAt)).ToList();
    }

    private static string Clean(string? value, int maxLength, string label)
    {
        var cleaned = value?.Trim() ?? string.Empty;
        if (cleaned.Length == 0) throw new InvalidOperationException($"{label} is required.");
        if (cleaned.Length > maxLength) throw new InvalidOperationException($"{label} cannot exceed {maxLength} characters.");
        return cleaned;
    }

    private static string ValidateChoice(string? value, IEnumerable<string> choices, string label)
    {
        var selected = value?.Trim() ?? string.Empty;
        var match = choices.FirstOrDefault(choice => string.Equals(choice, selected, StringComparison.OrdinalIgnoreCase));
        return match ?? throw new InvalidOperationException($"Choose a valid {label}.");
    }
}
