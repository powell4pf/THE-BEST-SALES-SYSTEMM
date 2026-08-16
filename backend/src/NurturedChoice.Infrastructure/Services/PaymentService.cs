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
        var query = _db.Payments.AsNoTracking().Where(x => !x.IsDeleted);
        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(x => x.PaymentDate)
            .Skip(request.Skip)
            .Take(request.PageSize)
            .Select(x => new
            {
                x.Id,
                x.ParentGroupId,
                x.PaymentDate,
                x.Amount,
                x.Method,
                x.Reference
            })
            .ToListAsync(cancellationToken);
        var customerIds = rows.Select(x => x.ParentGroupId).Distinct().ToArray();
        var customerNames = await _db.ParentGroups.AsNoTracking()
            .Where(x => customerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.CompanyName, cancellationToken);
        var paymentIds = rows.Select(x => x.Id).ToArray();
        var allocations = await _db.PaymentAllocations.AsNoTracking()
            .Where(x => paymentIds.Contains(x.PaymentId) && !x.IsDeleted)
            .GroupBy(x => x.PaymentId)
            .Select(group => new { PaymentId = group.Key, Amount = group.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.PaymentId, x => x.Amount, cancellationToken);
        var items = rows.Select(x => new PaymentListItemDto(x.Id, x.ParentGroupId, customerNames.GetValueOrDefault(x.ParentGroupId, "Unknown customer"), x.PaymentDate, x.Amount, x.Method, x.Reference, allocations.GetValueOrDefault(x.Id))).ToList();
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

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            var payment = await _db.Payments.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
            if (payment is null) return false;

            var allocations = await _db.PaymentAllocations
                .Where(x => x.PaymentId == payment.Id && !x.IsDeleted)
                .ToListAsync(cancellationToken);
            var invoiceIds = allocations.Where(x => x.InvoiceId.HasValue).Select(x => x.InvoiceId!.Value).Distinct().ToArray();

            payment.IsDeleted = true;
            payment.DeletedBy = userId;
            payment.DeletedAt = DateTime.UtcNow;
            foreach (var allocation in allocations)
            {
                allocation.IsDeleted = true;
                allocation.DeletedBy = userId;
                allocation.DeletedAt = DateTime.UtcNow;
            }

            if (invoiceIds.Length > 0)
            {
                var invoices = await _db.Invoices.Where(x => invoiceIds.Contains(x.Id) && !x.IsDeleted).ToListAsync(cancellationToken);
                var remaining = await _db.PaymentAllocations
                    .Where(x => x.InvoiceId.HasValue && invoiceIds.Contains(x.InvoiceId.Value) && !x.IsDeleted)
                    .GroupBy(x => x.InvoiceId!.Value)
                    .Select(x => new { InvoiceId = x.Key, Amount = x.Sum(a => a.Amount) })
                    .ToDictionaryAsync(x => x.InvoiceId, x => x.Amount, cancellationToken);

                foreach (var invoice in invoices)
                {
                    var paid = remaining.GetValueOrDefault(invoice.Id);
                    invoice.Status = paid >= invoice.GrandTotal
                        ? InvoiceStatus.Paid
                        : paid > 0
                            ? InvoiceStatus.PartiallyPaid
                            : InvoiceStatus.Finalized;
                    invoice.UpdatedBy = userId;
                }
            }

            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        });
    }
}
