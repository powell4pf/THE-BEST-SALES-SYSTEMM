namespace NurturedChoice.Application.DTOs.Support;

public sealed record CreateSupportTicketRequest(
    string Subject,
    string Description,
    string Category,
    string Priority);

public sealed record AddSupportTicketMessageRequest(string Body, bool Internal = false);

public sealed record UpdateSupportTicketRequest(
    string Status,
    string Priority,
    Guid? AssignedToId = null);

public sealed record SupportTicketListItemDto(
    Guid Id,
    string TicketNumber,
    string Subject,
    string Category,
    string Priority,
    string Status,
    string SubmittedBy,
    DateTime CreatedAt,
    DateTime LastActivityAt,
    int MessageCount,
    string? LastMessage);

public sealed record SupportTicketMessageDto(
    Guid Id,
    Guid AppUserId,
    string Author,
    string Body,
    string MessageType,
    bool IsInternal,
    string? PreviousStatus,
    string? NewStatus,
    DateTime CreatedAt);

public sealed record SupportTicketDetailsDto(
    Guid Id,
    string TicketNumber,
    string Subject,
    string Description,
    string Category,
    string Priority,
    string Status,
    Guid AppUserId,
    string SubmittedBy,
    Guid? AssignedToId,
    DateTime CreatedAt,
    DateTime LastActivityAt,
    IReadOnlyList<SupportTicketMessageDto> Messages);
