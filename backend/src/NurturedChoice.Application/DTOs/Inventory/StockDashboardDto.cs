namespace NurturedChoice.Application.DTOs.Inventory;

public sealed record StockDashboardDto(
    IReadOnlyList<StockDashboardStatDto> Stats,
    IReadOnlyList<string> Movements);

public sealed record StockDashboardStatDto(string Label, string Value);
