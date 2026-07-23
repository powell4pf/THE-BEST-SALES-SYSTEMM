namespace NurturedChoice.Application.DTOs.Billing;

public sealed record CreditNoteListItemDto(Guid Id, string CreditNoteNumber, string CustomerName, string? InvoiceNumber, DateOnly CreditNoteDate, decimal Total, string Status);

public sealed record CreditNoteItemDto(Guid Id, Guid? ProductId, string ItemName, decimal Quantity, decimal UnitPrice, decimal LineTotal, string? Reason);

public sealed record CreditNoteDetailsDto(Guid Id, string CreditNoteNumber, Guid CustomerId, Guid? InvoiceId, DateOnly CreditNoteDate, string Subject, decimal Total, string Status, IReadOnlyList<CreditNoteItemDto> Items);

public sealed record CreateCreditNoteRequest(string CreditNoteNumber, DateOnly CreditNoteDate, Guid CustomerId, Guid? InvoiceId, string Subject, IReadOnlyList<CreateCreditNoteItemRequest> Items);

public sealed record CreateCreditNoteItemRequest(Guid ProductId, decimal Quantity, decimal UnitPrice, string? Reason);
