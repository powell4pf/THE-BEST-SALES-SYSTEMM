using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/invoices")]
public sealed class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly ICurrentUserService _currentUser;

    public InvoicesController(IInvoiceService invoiceService, ICurrentUserService currentUser)
    {
        _invoiceService = invoiceService;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Permission("invoices.view")]
    public Task<PagedResult<InvoiceDto>> ListInvoices([FromQuery] PagedRequest request, CancellationToken cancellationToken)
        => _invoiceService.GetAsync(request, cancellationToken);

    [HttpGet("{id:guid}")]
    [Permission("invoices.view")]
    public async Task<IActionResult> GetInvoice(Guid id, CancellationToken cancellationToken)
        => (await _invoiceService.GetByIdAsync(id, cancellationToken)) is { } invoice ? Ok(invoice) : NotFound();

    [HttpPost]
    [Permission("invoices.manage")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var invoiceId = await _invoiceService.CreateDraftAsync(request, _currentUser.UserId, cancellationToken);
        return CreatedAtAction(nameof(GetInvoice), new { id = invoiceId }, new { id = invoiceId });
    }

    [HttpPut("{id:guid}")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] CreateInvoiceRequest request, CancellationToken cancellationToken)
        => await _invoiceService.UpdateAsync(id, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("{id:guid}")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> DeleteInvoice(Guid id, CancellationToken cancellationToken)
        => await _invoiceService.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/finalize")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> FinalizeInvoice(Guid id, CancellationToken cancellationToken)
        => await _invoiceService.FinalizeAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
