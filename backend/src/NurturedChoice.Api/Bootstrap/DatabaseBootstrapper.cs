using NurturedChoice.Infrastructure.Persistence;
using NurturedChoice.Application.Abstractions;

namespace NurturedChoice.Api.Bootstrap;

public static class DatabaseBootstrapper
{
    public static async Task BootstrapAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

        await SqlMigrationRunner.ApplyAsync(db);

        await db.SeedReferenceDataAsync(passwordHasher, app.Environment.IsDevelopment(), app.Configuration["Seed:DemoAdminPassword"]);
    }
}
