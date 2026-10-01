using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Workflow;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/approvals"), Permission("approvals.view")]
public sealed class ApprovalsController : ControllerBase
{
    private readonly IApprovalService _service;
    private readonly ICurrentUserService _currentUser;

    public ApprovalsController(IApprovalService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public Task<IReadOnlyList<ApprovalRequestDto>> List(CancellationToken cancellationToken) => _service.ListAsync(cancellationToken);

    [HttpPost("{id:guid}/approve"), Permission("approvals.manage")]
    public async Task<IActionResult> Approve(Guid id, ApprovalDecisionRequest request, CancellationToken cancellationToken)
        => await _service.ApproveAsync(id, _currentUser.UserId!.Value, request.Comment, cancellationToken) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/reject"), Permission("approvals.manage")]
    public async Task<IActionResult> Reject(Guid id, ApprovalDecisionRequest request, CancellationToken cancellationToken)
        => await _service.RejectAsync(id, _currentUser.UserId!.Value, request.Comment, cancellationToken) ? NoContent() : NotFound();
}
