namespace NurturedChoice.Application.DTOs.Billing;

public sealed record DeliveryNoteListItemDto(Guid Id, string DeliveryNoteNumber, string CustomerName, DateOnly DeliveryDate, int ProductCount, decimal TotalQuantity, string Status);

public sealed record DeliveryNoteItemDto(Guid Id, Guid? ProductId, string ProductName, decimal Quantity);

public sealed record DeliveryNoteDetailsDto(Guid Id, string DeliveryNoteNumber, Guid CustomerId, Guid? BranchId, DateOnly DeliveryDate, string? Notes, string Status, IReadOnlyList<DeliveryNoteItemDto> Items);

public sealed record CreateDeliveryNoteRequest(string DeliveryNoteNumber, DateOnly DeliveryDate, Guid CustomerId, Guid? BranchId, string? Notes, IReadOnlyList<CreateDeliveryNoteItemRequest> Items);

public sealed record CreateDeliveryNoteItemRequest(Guid ProductId, decimal Quantity);
