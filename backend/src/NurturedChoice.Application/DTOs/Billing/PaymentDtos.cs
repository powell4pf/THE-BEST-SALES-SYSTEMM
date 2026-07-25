namespace NurturedChoice.Application.DTOs.Billing;

public sealed record PaymentListItemDto(Guid Id, string CustomerName, DateOnly PaymentDate, decimal Amount, string Method, string? Reference, decimal AllocatedAmount);
public sealed record CreatePaymentRequest(Guid CustomerId, Guid? BranchId, DateOnly PaymentDate, decimal Amount, string Method, string? Reference, string? Notes, Guid? InvoiceId);
