using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/credit-notes")]
[Permission("creditnotes.view")]
public sealed class CreditNotesController : ControllerBase
{
    private readonly ICreditNoteService _service;
    private readonly ICurrentUserService _currentUser;

    public CreditNotesController(ICreditNoteService service, ICurrentUserService currentUser) { _service = service; _currentUser = currentUser; }

    [HttpGet] public Task<PagedResult<CreditNoteListItemDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken) => _service.GetAsync(request, cancellationToken);
    [HttpGet("next-number")] public async Task<object> NextNumber(CancellationToken cancellationToken) => new { nextNumber = await _service.GetNextNumberAsync(cancellationToken) };
    [HttpGet("{id:guid}")] public async Task<ActionResult<CreditNoteDetailsDto>> GetById(Guid id, CancellationToken cancellationToken) => (await _service.GetByIdAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();
    [HttpPost, Permission("creditnotes.manage")] public async Task<ActionResult<Guid>> Create(CreateCreditNoteRequest request, CancellationToken cancellationToken) { var id = await _service.CreateAsync(request, _currentUser.UserId, cancellationToken); return CreatedAtAction(nameof(GetById), new { id }, id); }
    [HttpPut("{id:guid}"), Permission("creditnotes.manage")] public async Task<IActionResult> Update(Guid id, CreateCreditNoteRequest request, CancellationToken cancellationToken) => await _service.UpdateAsync(id, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
    [HttpDelete("{id:guid}"), Permission("creditnotes.manage")] public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await _service.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
