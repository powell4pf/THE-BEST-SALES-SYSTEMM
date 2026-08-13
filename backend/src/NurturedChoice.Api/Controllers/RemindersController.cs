using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Domain.Entities.Settings;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Route("api/v1/reminders")]
public sealed class RemindersController : ControllerBase
{
    private readonly SalesDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ICurrentUserService _currentUser;

    public RemindersController(SalesDbContext db, IConfiguration configuration, ICurrentUserService currentUser)
    {
        _db = db;
        _configuration = configuration;
        _currentUser = currentUser;
    }

    [Authorize]
    [HttpGet("month-end")]
    public async Task<IReadOnlyList<MonthEndReminderDto>> GetUnread(CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return [];
        return await _db.MonthEndReminders.AsNoTracking()
            .Where(x => x.AppUserId == userId && x.ReadAt == null && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new MonthEndReminderDto(x.Id, x.PeriodKey, x.Title, x.Message, x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    [Authorize]
    [HttpPost("month-end/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        var reminder = await _db.MonthEndReminders.FirstOrDefaultAsync(x => x.Id == id && x.AppUserId == userId && !x.IsDeleted, cancellationToken);
        if (reminder is null) return NotFound();
        reminder.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("automation/month-end")]
    public async Task<IActionResult> CreateMonthEndReminders(CancellationToken cancellationToken)
    {
        var expectedKey = _configuration["Automation:MonthEndReminderKey"];
        var providedKey = Request.Headers["X-Automation-Key"].ToString();
        if (string.IsNullOrWhiteSpace(expectedKey) || !string.Equals(expectedKey, providedKey, StringComparison.Ordinal)) return Unauthorized();

        var zoneId = OperatingSystem.IsWindows() ? "E. Africa Standard Time" : "Africa/Nairobi";
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(zoneId)));
        if (today.Day != DateTime.DaysInMonth(today.Year, today.Month)) return Ok(new { created = 0, skipped = "Not the last day of the month." });

        var periodKey = today.ToString("yyyy-MM");
        var userIds = await _db.AppUsers.AsNoTracking().Where(x => x.Status == RecordStatus.Active).Select(x => x.Id).ToListAsync(cancellationToken);
        var notifiedUserIds = await _db.MonthEndReminders.AsNoTracking().Where(x => x.PeriodKey == periodKey).Select(x => x.AppUserId).ToListAsync(cancellationToken);
        var reminders = userIds.Except(notifiedUserIds).Select(userId => new MonthEndReminder
        {
            AppUserId = userId,
            PeriodKey = periodKey,
            Title = "Month-end work is ready",
            Message = "Generate customer statements and review this month's sales reports before closing the month.",
            CreatedAt = DateTime.UtcNow
        }).ToList();
        if (reminders.Count > 0)
        {
            _db.MonthEndReminders.AddRange(reminders);
            await _db.SaveChangesAsync(cancellationToken);
        }
        return Ok(new { created = reminders.Count, period = periodKey });
    }
}
