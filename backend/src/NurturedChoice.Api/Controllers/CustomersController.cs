using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Customers;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/parent-groups")]
public sealed class CustomersController : ControllerBase
{
    private readonly IParentGroupService _service;
    private readonly ICurrentUserService _currentUser;

    public CustomersController(IParentGroupService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public Task<PagedResult<ParentGroupListItemDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken)
        => _service.GetAsync(request, cancellationToken);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ParentGroupDetailsDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateParentGroupRequest request, CancellationToken cancellationToken)
    {
        var id = await _service.CreateAsync(request, _currentUser.UserId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateParentGroupRequest request, CancellationToken cancellationToken)
        => await _service.UpdateAsync(id, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        => await _service.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpPost("{parentGroupId:guid}/branches")]
    public async Task<ActionResult<Guid>> AddBranch(Guid parentGroupId, [FromBody] CreateBranchRequest request, CancellationToken cancellationToken)
    {
        var id = await _service.AddBranchAsync(parentGroupId, request, _currentUser.UserId, cancellationToken);
        return id is null ? NotFound() : Ok(id);
    }
}

