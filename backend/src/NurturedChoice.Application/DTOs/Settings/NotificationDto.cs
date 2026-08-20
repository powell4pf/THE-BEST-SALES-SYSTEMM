namespace NurturedChoice.Application.DTOs.Settings;

public sealed record NotificationDto(Guid Id, string DocumentType, Guid? DocumentId, string Title, string Message, string Route, DateTime CreatedAt, DateTime? ReadAt);
