using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Catalog;
using NurturedChoice.Api.Infrastructure;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/products")]
[Permission("products.view")]
public sealed class ProductsController : ControllerBase
{
    private readonly IProductService _service;
    private readonly ICurrentUserService _currentUser;

    public ProductsController(IProductService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    public Task<PagedResult<ProductDto>> Get([FromQuery] PagedRequest request, CancellationToken cancellationToken)
        => _service.GetAsync(request, cancellationToken);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Permission("products.manage")]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateProductRequest request, CancellationToken cancellationToken)
    {
        var id = await _service.CreateAsync(request, _currentUser.UserId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpPut("{id:guid}")]
    [Permission("products.manage")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
        => await _service.UpdateAsync(id, request, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("{id:guid}")]
    [Permission("products.manage")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        => await _service.DeleteAsync(id, _currentUser.UserId, cancellationToken) ? NoContent() : NotFound();
}
