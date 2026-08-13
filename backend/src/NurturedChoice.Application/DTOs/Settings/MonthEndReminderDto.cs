namespace NurturedChoice.Application.DTOs.Settings;

public sealed record MonthEndReminderDto(Guid Id, string PeriodKey, string Title, string Message, DateTime CreatedAt);
