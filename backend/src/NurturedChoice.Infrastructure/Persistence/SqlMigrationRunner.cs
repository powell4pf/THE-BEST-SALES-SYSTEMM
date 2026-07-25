using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace NurturedChoice.Infrastructure.Persistence;

public static class SqlMigrationRunner
{
    private const string MigrationTable = "schema_migrations";

    public static async Task ApplyAsync(SalesDbContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.OpenConnectionAsync(cancellationToken);
        // EF owns this connection. Do not dispose it here; the bootstrapper
        // continues using the DbContext for reference-data seeding afterward.
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await using (var createTable = new NpgsqlCommand($"create table if not exists {MigrationTable} (name varchar(255) primary key, applied_at timestamptz not null default now());", connection))
        {
            await createTable.ExecuteNonQueryAsync(cancellationToken);
        }

        var assembly = typeof(SqlMigrationRunner).Assembly;
        var resources = assembly.GetManifestResourceNames()
            .Where(name => name.Contains("Migrations.", StringComparison.Ordinal) && name.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        // Existing installations created directly by EF use quoted PascalCase
        // columns (for example "CompanyName"), while the shipped SQL baseline
        // targets lowercase snake_case columns. Treat that known schema as an
        // already-applied baseline rather than replaying incompatible SQL.
        await using (var detectExistingEfSchema = new NpgsqlCommand("""
            select exists (
                select 1
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'parent_groups'
                  and column_name = 'CompanyName'
            );
            """, connection))
        {
            if (Convert.ToBoolean(await detectExistingEfSchema.ExecuteScalarAsync(cancellationToken)))
            {
                foreach (var resource in resources)
                {
                    var migrationName = resource[(resource.LastIndexOf("Migrations.", StringComparison.Ordinal) + "Migrations.".Length)..];
                    await using var markExisting = new NpgsqlCommand($"insert into {MigrationTable} (name) values (@name) on conflict (name) do nothing;", connection);
                    markExisting.Parameters.AddWithValue("name", migrationName);
                    await markExisting.ExecuteNonQueryAsync(cancellationToken);
                }

                await db.Database.CloseConnectionAsync();
                return;
            }
        }

        foreach (var resource in resources)
        {
            var migrationName = resource[(resource.LastIndexOf("Migrations.", StringComparison.Ordinal) + "Migrations.".Length)..];
            await using var check = new NpgsqlCommand($"select exists (select 1 from {MigrationTable} where name = @name);", connection);
            check.Parameters.AddWithValue("name", migrationName);
            if (Convert.ToBoolean(await check.ExecuteScalarAsync(cancellationToken))) continue;

            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
            await using var stream = assembly.GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException($"Embedded migration resource '{resource}' was not found.");
            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync(cancellationToken);
            await using var command = new NpgsqlCommand(sql, connection, transaction);
            await command.ExecuteNonQueryAsync(cancellationToken);
            await using var mark = new NpgsqlCommand($"insert into {MigrationTable} (name) values (@name);", connection, transaction);
            mark.Parameters.AddWithValue("name", migrationName);
            await mark.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        await db.Database.CloseConnectionAsync();
    }
}
