using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/statements")]
[Permission("statements.view")]
public sealed class StatementsController : ControllerBase
{
    private readonly IStatementService _service;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    public StatementsController(IStatementService service, ICurrentUserService currentUser, INotificationService notifications) { _service = service; _currentUser = currentUser; _notifications = notifications; }

    [HttpGet("generate"), Permission("statements.manage")]
    public async Task<StatementDto> Generate([FromQuery] Guid customerId, [FromQuery] DateOnly startDate, [FromQuery] DateOnly endDate, CancellationToken cancellationToken)
    {
        var statement = await _service.GenerateAsync(customerId, startDate, endDate, cancellationToken);
        await _notifications.CreateAsync(_currentUser.UserId, "Statement", null, "Statement generated", $"Statement for {statement.CustomerName} was generated.", "/statements", cancellationToken);
        return statement;
    }
}
