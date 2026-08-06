namespace NurturedChoice.Domain.Enums;

public enum InvoiceStatus
{
    Draft = 0,
    Finalized = 1,
    Paid = 2,
    PartiallyPaid = 3,
    Overdue = 4,
    Cancelled = 5
}