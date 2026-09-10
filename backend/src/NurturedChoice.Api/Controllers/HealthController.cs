using Microsoft.AspNetCore.Mvc;
using NurturedChoice.Infrastructure.Persistence;
using System.Diagnostics;

namespace NurturedChoice.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly SalesDbContext _db;
    public HealthController(SalesDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var databaseHealthy = false;
        try { databaseHealthy = await _db.Database.CanConnectAsync(cancellationToken); }
        catch { databaseHealthy = false; }
        stopwatch.Stop();

        var status = databaseHealthy ? "healthy" : "degraded";
        var response = new
        {
            status,
            api = "healthy",
            database = databaseHealthy ? "healthy" : "unavailable",
            latencyMs = stopwatch.ElapsedMilliseconds,
            utcNow = DateTime.UtcNow
        };
        return databaseHealthy ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}
