using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Support;

namespace NurturedChoice.Api.Controllers;

[ApiController, Authorize, Route("api/v1/support")]
public sealed class SupportController : ControllerBase
{
    private readonly ISupportService _support;
    private readonly ICurrentUserService _currentUser;

    public SupportController(ISupportService support, ICurrentUserService currentUser)
    {
        _support = support;
        _currentUser = currentUser;
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<IReadOnlyList<SupportTicketListItemDto>>> List(CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        return Ok(await _support.ListAsync(userId, cancellationToken));
    }

    [HttpGet("tickets/{id:guid}")]
    public async Task<ActionResult<SupportTicketDetailsDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        var ticket = await _support.GetAsync(id, userId, cancellationToken);
        return ticket is null ? NotFound() : Ok(ticket);
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<SupportTicketDetailsDto>> Create(CreateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        var ticket = await _support.CreateAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, ticket);
    }

    [HttpPost("tickets/{id:guid}/messages")]
    public async Task<ActionResult<SupportTicketDetailsDto>> AddMessage(Guid id, AddSupportTicketMessageRequest request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        var ticket = await _support.AddMessageAsync(id, request, userId, cancellationToken);
        return ticket is null ? NotFound() : Ok(ticket);
    }

    [HttpPut("tickets/{id:guid}")]
    public async Task<ActionResult<SupportTicketDetailsDto>> Update(Guid id, UpdateSupportTicketRequest request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId) return Unauthorized();
        var ticket = await _support.UpdateAsync(id, request, userId, cancellationToken);
        return ticket is null ? Forbid() : Ok(ticket);
    }
}
