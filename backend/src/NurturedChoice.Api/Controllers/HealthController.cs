using Microsoft.AspNetCore.Mvc;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        status = "healthy",
        utcNow = DateTime.UtcNow
    });
}

