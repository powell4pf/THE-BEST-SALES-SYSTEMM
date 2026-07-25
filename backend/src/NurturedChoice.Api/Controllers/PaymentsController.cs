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
    private readonly IPaymentService _service; private readonly ICurrentUserService _currentUser;
    public PaymentsController(IPaymentService service, ICurrentUserService currentUser) { _service = service; _currentUser = currentUser; }
    [HttpGet] public Task<PagedResult<PaymentListItemDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken) => _service.GetAsync(request, cancellationToken);
    [HttpPost, Permission("invoices.manage")] public async Task<ActionResult<Guid>> Create(CreatePaymentRequest request, CancellationToken cancellationToken) => Ok(await _service.CreateAsync(request, _currentUser.UserId, cancellationToken));
}
