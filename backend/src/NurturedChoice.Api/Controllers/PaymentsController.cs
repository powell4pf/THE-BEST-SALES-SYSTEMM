using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/payments"), Permission("invoices.view")]
public sealed class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service; private readonly ICurrentUserService _currentUser; private readonly INotificationService _notifications;
    public PaymentsController(IPaymentService service, ICurrentUserService currentUser, INotificationService notifications) { _service = service; _currentUser = currentUser; _notifications = notifications; }
    [HttpGet] public Task<PagedResult<PaymentListItemDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken) => _service.GetAsync(request, cancellationToken);
    [HttpPost, Permission("invoices.manage")] public async Task<ActionResult<Guid>> Create(CreatePaymentRequest request, CancellationToken cancellationToken) { var id = await _service.CreateAsync(request, _currentUser.UserId, cancellationToken); await _notifications.CreateAsync(_currentUser.UserId, "Payment", id, "Payment received", $"A payment of KES {request.Amount:N2} was recorded.", "/payments", cancellationToken); return Ok(id); }
    [HttpDelete("{id:guid}"), Permission("payments.delete")] public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await _service.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
