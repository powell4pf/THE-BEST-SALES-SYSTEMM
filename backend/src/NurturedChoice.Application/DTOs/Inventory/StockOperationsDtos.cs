namespace NurturedChoice.Application.DTOs.Inventory;

public sealed record CreateStockAdjustmentRequest(
    Guid ProductId,
    decimal AdjustedQuantity,
    string Reason,
    string? Notes);

public sealed record StockAdjustmentDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    decimal PreviousQuantity,
    decimal AdjustedQuantity,
    decimal ChangeQuantity,
    string Reason,
    string? Notes,
    DateTime CreatedAt);

public sealed record StockMovementListItemDto(
    Guid Id,
    DateTime CreatedAt,
    Guid ProductId,
    string ProductName,
    string MovementType,
    decimal Quantity,
    decimal UnitCost,
    string? SourceDocumentType,
    string? Notes);
