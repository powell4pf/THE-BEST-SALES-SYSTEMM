using NurturedChoice.Infrastructure.Persistence;
using NurturedChoice.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace NurturedChoice.Api.Bootstrap;

public static class DatabaseBootstrapper
{
    public static async Task BootstrapAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SalesDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

        if (app.Environment.IsDevelopment())
        {
            await db.Database.EnsureCreatedAsync();
        }
        else
        {
            await db.Database.MigrateAsync();
        }

        // The project ships SQL migrations rather than EF migration snapshots.
        // Keep this idempotent guard here so existing installations receive the
        // audit table before authentication tries to persist a new session.
        await db.Database.ExecuteSqlRawAsync("""
            create table if not exists audit_logs (
                "Id" uuid primary key,
                "UserId" uuid null references app_users("Id") on delete set null,
                "Action" varchar(30) not null,
                "EntityName" varchar(150) not null,
                "EntityId" uuid not null,
                "Changes" jsonb not null,
                "CreatedAt" timestamptz not null default now()
            );
            create index if not exists ix_audit_logs_entity on audit_logs("EntityName", "EntityId", "CreatedAt");
            create index if not exists ix_audit_logs_user on audit_logs("UserId");
            """);

        await db.SeedReferenceDataAsync(passwordHasher);
    }
}
