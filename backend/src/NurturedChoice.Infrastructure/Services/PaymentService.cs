using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class PaymentService : IPaymentService
{
    private readonly SalesDbContext _db;
    public PaymentService(SalesDbContext db) => _db = db;

    public async Task<PagedResult<PaymentListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = from payment in _db.Payments.AsNoTracking()
                    join customer in _db.ParentGroups.AsNoTracking() on payment.ParentGroupId equals customer.Id
                    select new PaymentListItemDto(payment.Id, customer.CompanyName, payment.PaymentDate, payment.Amount, payment.Method, payment.Reference, payment.Allocations.Where(x => !x.IsDeleted).Sum(x => (decimal?)x.Amount) ?? 0m);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.PaymentDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(cancellationToken);
        return new PagedResult<PaymentListItemDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<Guid> CreateAsync(CreatePaymentRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0) throw new InvalidOperationException("Payment amount must be greater than zero.");
        if (!await _db.ParentGroups.AnyAsync(x => x.Id == request.CustomerId, cancellationToken)) throw new InvalidOperationException("Customer was not found.");
        var payment = new Payment { ParentGroupId = request.CustomerId, BranchId = request.BranchId, PaymentDate = request.PaymentDate, Amount = request.Amount, Method = request.Method.Trim(), Reference = request.Reference?.Trim(), Notes = request.Notes?.Trim(), CreatedBy = userId };
        if (request.InvoiceId is Guid invoiceId)
        {
            var invoice = await _db.Invoices.FirstOrDefaultAsync(x => x.Id == invoiceId && x.ParentGroupId == request.CustomerId, cancellationToken) ?? throw new InvalidOperationException("Invoice was not found for this customer.");
            var allocated = await _db.PaymentAllocations.Where(x => x.InvoiceId == invoiceId).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var outstanding = invoice.GrandTotal - allocated;
            if (request.Amount > outstanding) throw new InvalidOperationException($"Payment exceeds the invoice balance of {outstanding:N2}.");
            payment.Allocations.Add(new PaymentAllocation { InvoiceId = invoiceId, Amount = request.Amount, CreatedBy = userId });
            invoice.Status = request.Amount == outstanding ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
            invoice.UpdatedBy = userId;
        }
        _db.Payments.Add(payment); await _db.SaveChangesAsync(cancellationToken); return payment.Id;
    }
}
