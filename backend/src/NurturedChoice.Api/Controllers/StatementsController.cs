using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/statements")]
[Permission("statements.view")]
public sealed class StatementsController : ControllerBase
{
    private readonly IStatementService _service;
    public StatementsController(IStatementService service) => _service = service;

    [HttpGet("generate"), Permission("statements.manage")]
    public Task<StatementDto> Generate([FromQuery] Guid customerId, [FromQuery] DateOnly startDate, [FromQuery] DateOnly endDate, CancellationToken cancellationToken) => _service.GenerateAsync(customerId, startDate, endDate, cancellationToken);
}
