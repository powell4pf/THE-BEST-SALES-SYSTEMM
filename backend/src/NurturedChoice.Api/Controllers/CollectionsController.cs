using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Api.Infrastructure;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Reports;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize]
[Route("api/v1/collections")]
[Permission("reports.view")]
public sealed class CollectionsController : ControllerBase
{
    private readonly ICollectionsService _service;
    private readonly ICurrentUserService _currentUser;
    public CollectionsController(ICollectionsService service, ICurrentUserService currentUser) { _service = service; _currentUser = currentUser; }

    [HttpGet("overview")]
    public Task<CollectionsOverviewDto> Overview(CancellationToken cancellationToken) => _service.GetOverviewAsync(cancellationToken);

    [HttpPut("{customerId:guid}/follow-up")]
    public async Task<IActionResult> UpdateFollowUp(Guid customerId, UpdateCollectionFollowUpRequest request, CancellationToken cancellationToken)
        => await _service.UpdateFollowUpAsync(customerId, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
