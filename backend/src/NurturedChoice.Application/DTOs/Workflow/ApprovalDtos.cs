namespace NurturedChoice.Application.DTOs.Workflow;

public sealed record ApprovalRequestDto(
    Guid Id,
    string RequestType,
    Guid EntityId,
    Guid RequestedBy,
    string RequestedByName,
    string Status,
    string? Reason,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string? DecisionComment);

public sealed record ApprovalDecisionRequest(string? Comment);
