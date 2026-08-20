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

        await db.Database.ExecuteSqlRawAsync("""
            create table if not exists delivery_notes (
                id uuid primary key,
                delivery_note_number varchar(100) not null,
                parent_group_id uuid not null,
                branch_id uuid null,
                delivery_date date not null,
                notes varchar(2000) null,
                status integer not null default 0,
                row_version bytea null,
                created_at timestamptz not null default now(),
                created_by uuid null,
                updated_at timestamptz null,
                updated_by uuid null,
                is_deleted boolean not null default false,
                deleted_at timestamptz null,
                deleted_by uuid null
            );
            create unique index if not exists ux_delivery_notes_number on delivery_notes(delivery_note_number);
            create index if not exists ix_delivery_notes_parent_group_date on delivery_notes(parent_group_id, delivery_date);
            create table if not exists delivery_note_items (
                id uuid primary key,
                delivery_note_id uuid not null references delivery_notes(id) on delete cascade,
                product_id uuid null,
                item_name varchar(255) not null,
                quantity numeric(18,3) not null,
                row_version bytea null,
                created_at timestamptz not null default now(),
                created_by uuid null,
                updated_at timestamptz null,
                updated_by uuid null,
                is_deleted boolean not null default false,
                deleted_at timestamptz null,
                deleted_by uuid null
            );
            create index if not exists ix_delivery_note_items_delivery_note on delivery_note_items(delivery_note_id);
            """);

        await db.Database.ExecuteSqlRawAsync("""
            create table if not exists notifications (
                id uuid primary key,
                app_user_id uuid not null,
                document_type varchar(60) not null,
                document_id uuid null,
                title varchar(180) not null,
                message varchar(500) not null,
                route varchar(160) not null,
                read_at timestamptz null,
                created_at timestamptz not null default now(),
                created_by uuid null,
                updated_at timestamptz null,
                updated_by uuid null,
                is_deleted boolean not null default false,
                deleted_at timestamptz null,
                deleted_by uuid null
            );
            create index if not exists ix_notifications_user_created on notifications(app_user_id, created_at desc);
            update notifications set created_at = now() where created_at < timestamp with time zone '2000-01-01 00:00:00+00';
            """);

        // Older databases may already have products and stock balances but no
        // movement audit rows. Seed one opening-balance entry per such product
        // so the stock history reflects the inventory already on hand.
        var productsWithoutMovements = await db.Products
            .AsNoTracking()
            .Where(product => !product.IsDeleted && !db.StockMovements.Any(movement => movement.ProductId == product.Id))
            .ToListAsync();
        if (productsWithoutMovements.Count > 0)
        {
            db.StockMovements.AddRange(productsWithoutMovements.Select(product => new NurturedChoice.Domain.Entities.Inventory.StockMovement
            {
                ProductId = product.Id,
                MovementType = NurturedChoice.Domain.Enums.StockMovementType.OpeningBalance,
                Quantity = product.CurrentStock,
                UnitCost = product.BuyingPrice,
                SourceDocumentType = "Product",
                SourceDocumentId = product.Id,
                Notes = "Opening stock history created for an existing product.",
                CreatedAt = DateTime.UtcNow
            }));
            await db.SaveChangesAsync();
        }

        await db.SeedReferenceDataAsync(passwordHasher, app.Environment.IsDevelopment(), app.Configuration["Seed:DemoAdminPassword"]);
    }
}
