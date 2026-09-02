namespace NurturedChoice.Application.DTOs.Inventory;

public sealed record StockDashboardDto(
    IReadOnlyList<StockDashboardStatDto> Stats,
    IReadOnlyList<StockMovementDto> Movements);

public sealed record StockDashboardStatDto(string Label, string Value);

public sealed record StockMovementDto(
    DateTime CreatedAt,
    string ProductName,
    string MovementType,
    decimal Quantity,
    decimal CurrentStock);
