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

        await SqlMigrationRunner.ApplyAsync(db);

        // Older installations may have been created from the EF schema path,
        // which intentionally marks the baseline SQL migrations as applied.
        // Keep the collections feature deployable to those databases too.
        await db.Database.ExecuteSqlRawAsync("""
            create table if not exists collection_follow_ups (
                id uuid primary key,
                -- Some earlier customer schemas used a different key column name.
                -- The application still validates the customer id before saving;
                -- omitting the FK keeps upgrades compatible with those databases.
                parent_group_id uuid not null,
                status varchar(40) not null default 'Not contacted',
                next_follow_up_date date null,
                last_contacted_at timestamptz null,
                last_contact_method varchar(40) null,
                notes varchar(2000) null,
                created_at timestamptz not null default now(),
                created_by uuid null,
                updated_at timestamptz null,
                updated_by uuid null,
                is_deleted boolean not null default false,
                deleted_at timestamptz null,
                deleted_by uuid null,
                row_version bytea null
            );
            create unique index if not exists ux_collection_follow_ups_parent_group on collection_follow_ups(parent_group_id);
            """);

        await db.SeedReferenceDataAsync(passwordHasher, app.Environment.IsDevelopment(), app.Configuration["Seed:DemoAdminPassword"]);
    }
}
