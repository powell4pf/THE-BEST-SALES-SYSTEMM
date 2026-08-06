using Npgsql;

const string sourceVariable = "SOURCE_CONNECTION_STRING";
const string targetVariable = "TARGET_CONNECTION_STRING";
var apply = args.Any(x => string.Equals(x, "--apply", StringComparison.OrdinalIgnoreCase));
var sourceConnectionString = Environment.GetEnvironmentVariable(sourceVariable);
var targetConnectionString = Environment.GetEnvironmentVariable(targetVariable);

if (string.IsNullOrWhiteSpace(sourceConnectionString) || string.IsNullOrWhiteSpace(targetConnectionString))
{
    Console.Error.WriteLine($"Set {sourceVariable} and {targetVariable} before running this utility.");
    Environment.ExitCode = 2;
    return;
}

var tableOrder = new[]
{
    "parent_groups", "branches", "products", "product_images",
    "invoice_number_settings", "invoice_number_sequences", "invoices", "invoice_items",
    "stock_movements", "stock_balances", "stock_adjustments",
    "app_users", "app_roles", "app_permissions", "app_user_roles", "app_role_permissions", "refresh_tokens",
    "company_profiles", "system_settings", "credit_notes", "credit_note_items",
    "payments", "payment_allocations", "statements", "statement_lines", "collection_follow_ups", "audit_logs"
};

await using var source = new NpgsqlConnection(NormalizeConnectionString(sourceConnectionString));
await using var target = new NpgsqlConnection(NormalizeConnectionString(targetConnectionString));
await source.OpenAsync();
await target.OpenAsync();

var sourceTables = await GetTablesAsync(source);
var targetTables = await GetTablesAsync(target);
var tables = tableOrder.Where(sourceTables.Contains).Where(targetTables.Contains).ToArray();

Console.WriteLine($"Source tables found: {tables.Length}");
Console.WriteLine(apply
    ? "APPLY mode: Railway data tables will be replaced inside one transaction."
    : "DRY-RUN mode: no Railway data will be changed. Use --apply only after reviewing the output.");

await using var transaction = await target.BeginTransactionAsync();
try
{
    if (apply)
    {
        var truncateList = string.Join(", ", tables.Select(QuoteIdentifier));
        await ExecuteAsync(target, transaction, $"TRUNCATE TABLE {truncateList} CASCADE;");
    }

    foreach (var table in tables)
    {
        var sourceColumns = await GetColumnsAsync(source, table);
        var targetColumns = await GetColumnsAsync(target, table);
        var mappings = sourceColumns
            .Select(sourceColumn => (Source: sourceColumn, Target: ResolveTargetColumn(sourceColumn, targetColumns)))
            .Where(mapping => mapping.Target is not null)
            .Select(mapping => (mapping.Source, Target: mapping.Target!))
            .ToArray();

        var selectSql = $"select {string.Join(", ", mappings.Select(x => QuoteIdentifier(x.Source)))} from {QuoteIdentifier(table)};";
        await using var sourceCommand = new NpgsqlCommand(selectSql, source);
        await using var reader = await sourceCommand.ExecuteReaderAsync();
        var count = 0;

        while (await reader.ReadAsync())
        {
            if (!apply)
            {
                count++;
                continue;
            }

            var parameterNames = Enumerable.Range(0, mappings.Length).Select(index => $"@p{index}").ToArray();
            var insertSql = $"insert into {QuoteIdentifier(table)} ({string.Join(", ", mappings.Select(x => QuoteIdentifier(x.Target)))}) values ({string.Join(", ", parameterNames)});";
            await using var insert = new NpgsqlCommand(insertSql, target, transaction);
            for (var index = 0; index < mappings.Length; index++)
            {
                var value = reader.IsDBNull(index) ? DBNull.Value : reader.GetValue(index);
                insert.Parameters.AddWithValue(parameterNames[index], value);
            }
            await insert.ExecuteNonQueryAsync();
            count++;
        }

        Console.WriteLine($"{table}: {count} row(s)");
    }

    if (apply)
    {
        await transaction.CommitAsync();
        Console.WriteLine("Migration committed successfully.");
    }
    else
    {
        await transaction.RollbackAsync();
        Console.WriteLine("Dry-run complete; Railway was not changed.");
    }
}
catch
{
    await transaction.RollbackAsync();
    Console.Error.WriteLine("Migration failed; all target changes were rolled back.");
    throw;
}

static async Task<HashSet<string>> GetTablesAsync(NpgsqlConnection connection)
{
    const string sql = "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';";
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();
    var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
    return tables;
}

static async Task<string[]> GetColumnsAsync(NpgsqlConnection connection, string table)
{
    const string sql = "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position;";
    await using var command = new NpgsqlCommand(sql, connection);
    command.Parameters.AddWithValue(table);
    await using var reader = await command.ExecuteReaderAsync();
    var columns = new List<string>();
    while (await reader.ReadAsync()) columns.Add(reader.GetString(0));
    return columns.ToArray();
}

static async Task ExecuteAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string sql)
{
    await using var command = new NpgsqlCommand(sql, connection, transaction);
    await command.ExecuteNonQueryAsync();
}

static string QuoteIdentifier(string value) => $"\"{value.Replace("\"", "\"\"")}\"";

static string NormalizeConnectionString(string value)
{
    if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return value;
    }

    var uri = new Uri(value);
    var credentials = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(credentials[0]);
    var password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : string.Empty;
    var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
    return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}

static string ToSnakeCase(string value)
{
    if (string.IsNullOrEmpty(value)) return value;
    var result = new System.Text.StringBuilder(value.Length + 8);
    for (var index = 0; index < value.Length; index++)
    {
        var character = value[index];
        if (char.IsUpper(character))
        {
            var previousIsLower = index > 0 && char.IsLower(value[index - 1]);
            var previousIsUpper = index > 0 && char.IsUpper(value[index - 1]);
            var nextIsLower = index + 1 < value.Length && char.IsLower(value[index + 1]);
            if (index > 0 && (previousIsLower || (previousIsUpper && nextIsLower))) result.Append('_');
            result.Append(char.ToLowerInvariant(character));
        }
        else result.Append(character);
    }
    return result.ToString();
}

static string? ResolveTargetColumn(string sourceColumn, IReadOnlyCollection<string> targetColumns)
{
    var snakeCase = ToSnakeCase(sourceColumn);
    return targetColumns.FirstOrDefault(column => string.Equals(column, snakeCase, StringComparison.OrdinalIgnoreCase))
        ?? targetColumns.FirstOrDefault(column => string.Equals(column, sourceColumn, StringComparison.Ordinal))
        ?? targetColumns.FirstOrDefault(column => string.Equals(column, sourceColumn, StringComparison.OrdinalIgnoreCase));
}
