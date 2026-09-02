using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/delivery-notes")]
[Permission("deliverynotes.view")]
public sealed class DeliveryNotesController : ControllerBase
{
    private readonly IDeliveryNoteService _service;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    public DeliveryNotesController(IDeliveryNoteService service, ICurrentUserService currentUser, INotificationService notifications) { _service = service; _currentUser = currentUser; _notifications = notifications; }
    [HttpGet] public Task<PagedResult<DeliveryNoteListItemDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken) => _service.GetAsync(request, cancellationToken);
    [HttpGet("next-number")] public async Task<object> NextNumber(CancellationToken cancellationToken) => new { nextNumber = await _service.GetNextNumberAsync(cancellationToken) };
    [HttpGet("{id:guid}")] public async Task<ActionResult<DeliveryNoteDetailsDto>> GetById(Guid id, CancellationToken cancellationToken) => (await _service.GetByIdAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();
    [HttpPost, Permission("deliverynotes.manage")] public async Task<ActionResult<Guid>> Create(CreateDeliveryNoteRequest request, CancellationToken cancellationToken) { var id = await _service.CreateAsync(request, _currentUser.UserId, cancellationToken); await _notifications.CreateAsync(_currentUser.UserId, "Delivery Note", id, "Delivery note generated", $"Delivery note {request.DeliveryNoteNumber} was created.", "/delivery-notes", cancellationToken); return CreatedAtAction(nameof(GetById), new { id }, id); }
    [HttpPut("{id:guid}"), Permission("deliverynotes.manage")] public async Task<IActionResult> Update(Guid id, CreateDeliveryNoteRequest request, CancellationToken cancellationToken) => await _service.UpdateAsync(id, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
    [HttpDelete("{id:guid}"), Permission("deliverynotes.delete")] public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await _service.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
