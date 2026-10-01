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
    private readonly INotificationService _notifications;
    private readonly IApprovalService _approvals;
    private readonly IPermissionService _permissions;

    public InvoicesController(IInvoiceService invoiceService, ICurrentUserService currentUser, INotificationService notifications, IApprovalService approvals, IPermissionService permissions)
    {
        _invoiceService = invoiceService;
        _currentUser = currentUser;
        _notifications = notifications;
        _approvals = approvals;
        _permissions = permissions;
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
        await _notifications.CreateAsync(_currentUser.UserId, "Invoice", invoiceId, "Invoice generated", $"Invoice {request.InvoiceNumber ?? invoiceId.ToString()[..8]} was created.", "/invoices", cancellationToken);
        return CreatedAtAction(nameof(GetInvoice), new { id = invoiceId }, new { id = invoiceId });
    }

    [HttpPut("{id:guid}")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        if (await _invoiceService.UpdateAsync(id, request, _currentUser.UserId, cancellationToken)) return NoContent();

        var invoice = await _invoiceService.GetByIdAsync(id, cancellationToken);
        return invoice is null
            ? NotFound()
            : Conflict(new ProblemDetails
            {
                Title = "Invoice cannot be edited",
                Detail = "Only draft invoices can be edited. Finalized invoices are read-only."
            });
    }

    [HttpDelete("{id:guid}"), Permission("invoices.delete")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> DeleteInvoice(Guid id, CancellationToken cancellationToken)
        => await _invoiceService.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/finalize")]
    [Permission("invoices.manage")]
    public async Task<IActionResult> FinalizeInvoice(Guid id, CancellationToken cancellationToken)
    {
        if (await _permissions.HasPermissionAsync(_currentUser.UserId, "approvals.manage", cancellationToken))
            return await _invoiceService.FinalizeAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
        var invoice = await _invoiceService.GetByIdAsync(id, cancellationToken);
        if (invoice is null) return NotFound();
        var type = string.IsNullOrWhiteSpace(invoice.PaymentTerms) || invoice.PaymentTerms.Contains("cash", StringComparison.OrdinalIgnoreCase) ? "InvoiceFinalize" : "InvoiceCreditSale";
        var approvalId = await _approvals.RequestAsync(type, id, _currentUser.UserId!.Value, "Invoice finalization requires approval.", "{}", cancellationToken);
        return Accepted(new { approvalRequired = true, approvalId });
    }

    [HttpPost("{id:guid}/cancel"), Permission("invoices.manage")]
    public async Task<IActionResult> CancelInvoice(Guid id, CancellationToken cancellationToken)
    {
        if (await _permissions.HasPermissionAsync(_currentUser.UserId, "approvals.manage", cancellationToken))
            return await _invoiceService.CancelAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
        var approvalId = await _approvals.RequestAsync("InvoiceCancellation", id, _currentUser.UserId!.Value, "Invoice cancellation requires approval.", "{}", cancellationToken);
        return Accepted(new { approvalRequired = true, approvalId });
    }
}
