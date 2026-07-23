using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class StatementService : IStatementService
{
    private readonly SalesDbContext _db;

    public StatementService(SalesDbContext db) => _db = db;

    public async Task<StatementDto> GenerateAsync(Guid customerId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
    {
        var customer = await _db.ParentGroups.AsNoTracking().FirstOrDefaultAsync(x => x.Id == customerId, cancellationToken)
            ?? throw new InvalidOperationException("Customer was not found.");

        var invoices = await _db.Invoices.AsNoTracking()
            .Where(x => x.ParentGroupId == customerId && x.InvoiceDate >= startDate && x.InvoiceDate <= endDate && x.Status != Domain.Enums.InvoiceStatus.Cancelled && x.Status != Domain.Enums.InvoiceStatus.Draft)
            .OrderBy(x => x.InvoiceDate).ThenBy(x => x.InvoiceNumber)
            .Select(x => new { x.InvoiceDate, x.InvoiceNumber, x.GrandTotal })
            .ToListAsync(cancellationToken);

        var payments = await _db.Payments.AsNoTracking()
            .Where(x => x.ParentGroupId == customerId && x.PaymentDate >= startDate && x.PaymentDate <= endDate)
            .OrderBy(x => x.PaymentDate)
            .Select(x => new { x.PaymentDate, x.Reference, x.Amount })
            .ToListAsync(cancellationToken);

        var beforeInvoices = await _db.Invoices.AsNoTracking().Where(x => x.ParentGroupId == customerId && x.InvoiceDate < startDate && x.Status != Domain.Enums.InvoiceStatus.Cancelled && x.Status != Domain.Enums.InvoiceStatus.Draft).SumAsync(x => (decimal?)x.GrandTotal, cancellationToken) ?? 0m;
        var beforePayments = await _db.Payments.AsNoTracking().Where(x => x.ParentGroupId == customerId && x.PaymentDate < startDate).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
        var balance = beforeInvoices - beforePayments;
        var transactions = new List<StatementTransactionDto>();
        transactions.Add(new StatementTransactionDto(startDate, "OPENING", "Opening balance", 0, 0, balance));

        foreach (var transaction in invoices.Select(x => (x.InvoiceDate, Document: x.InvoiceNumber, Description: "Invoice", Debit: x.GrandTotal, Credit: 0m))
            .Concat(payments.Select(x => (x.PaymentDate, Document: x.Reference ?? "PAYMENT", Description: "Payment received", Debit: 0m, Credit: x.Amount)))
            .OrderBy(x => x.Item1))
        {
            balance += transaction.Debit - transaction.Credit;
            transactions.Add(new StatementTransactionDto(transaction.Item1, transaction.Document, transaction.Description, transaction.Debit, transaction.Credit, balance));
        }

        return new StatementDto(customer.CompanyName, startDate, endDate, transactions[0].Balance, balance, transactions);
    }
}
