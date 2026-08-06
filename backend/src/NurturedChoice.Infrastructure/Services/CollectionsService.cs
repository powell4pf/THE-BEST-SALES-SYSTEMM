using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Reports;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class CollectionsService : ICollectionsService
{
    private readonly SalesDbContext _db;
    public CollectionsService(SalesDbContext db) => _db = db;

    public async Task<CollectionsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var invoices = await _db.Invoices.AsNoTracking()
            .Include(x => x.Branch)
            .Where(x => x.Status != Domain.Enums.InvoiceStatus.Cancelled && x.Status != Domain.Enums.InvoiceStatus.Draft && !x.IsDeleted)
            .Select(x => new { x.Id, x.ParentGroupId, x.InvoiceNumber, Branch = x.Branch == null ? null : x.Branch.BranchName, x.InvoiceDate, x.DueDate, x.GrandTotal })
            .ToListAsync(cancellationToken);
        var payments = await _db.Payments.AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select(x => new { x.ParentGroupId, x.PaymentDate, x.Amount })
            .ToListAsync(cancellationToken);
        var customers = await _db.ParentGroups.AsNoTracking().Where(x => !x.IsDeleted).ToListAsync(cancellationToken);
        var followUps = await _db.Set<CollectionFollowUp>().AsNoTracking().ToDictionaryAsync(x => x.ParentGroupId, cancellationToken);
        var customerRows = new List<CollectionCustomerDto>();

        foreach (var customer in customers)
        {
            var customerInvoices = invoices.Where(x => x.ParentGroupId == customer.Id).OrderBy(x => x.DueDate ?? x.InvoiceDate).ThenBy(x => x.InvoiceDate).ToList();
            var customerPayments = payments.Where(x => x.ParentGroupId == customer.Id).OrderBy(x => x.PaymentDate).ToList();
            var remainingPayments = customerPayments.Sum(x => x.Amount);
            var invoiceRows = new List<CollectionInvoiceDto>();
            foreach (var invoice in customerInvoices)
            {
                var paid = Math.Min(invoice.GrandTotal, Math.Max(0m, remainingPayments));
                remainingPayments -= paid;
                var outstanding = Math.Max(0m, invoice.GrandTotal - paid);
                if (outstanding <= 0) continue;
                var dueDate = invoice.DueDate ?? invoice.InvoiceDate;
                var daysOverdue = Math.Max(0, today.DayNumber - dueDate.DayNumber);
                invoiceRows.Add(new CollectionInvoiceDto(invoice.Id, invoice.InvoiceNumber, invoice.Branch, invoice.InvoiceDate, invoice.DueDate, invoice.GrandTotal, paid, outstanding, daysOverdue));
            }

            var outstandingBalance = invoiceRows.Sum(x => x.Outstanding);
            if (outstandingBalance <= 0) continue;
            var overdue = invoiceRows.Where(x => x.DaysOverdue > 0).Sum(x => x.Outstanding);
            var current = outstandingBalance - overdue;
            var oldestDays = invoiceRows.Max(x => x.DaysOverdue);
            var followUp = followUps.GetValueOrDefault(customer.Id);
            var risk = customer.CreditLimit > 0 && outstandingBalance >= customer.CreditLimit ? "Over credit limit" : overdue > 0 ? "Overdue" : "Current";
            customerRows.Add(new CollectionCustomerDto(customer.Id, customer.CompanyName, customer.ContactPerson, customer.Email, customer.Phone, customer.CreditLimit, outstandingBalance, current, overdue, oldestDays, risk, followUp?.Status ?? "Not contacted", followUp?.NextFollowUpDate, followUp?.LastContactedAt, followUp?.LastContactMethod, followUp?.Notes, invoiceRows));
        }

        customerRows = customerRows.OrderByDescending(x => x.OverdueBalance).ThenByDescending(x => x.OutstandingBalance).ToList();
        var total = customerRows.Sum(x => x.OutstandingBalance);
        var overdueTotal = customerRows.Sum(x => x.OverdueBalance);
        var dueToday = customerRows.SelectMany(x => x.Invoices).Where(x => x.DaysOverdue == 0 && (x.DueDate ?? x.InvoiceDate) == today).Sum(x => x.Outstanding);
        var dueNext7 = customerRows.SelectMany(x => x.Invoices).Where(x => x.DaysOverdue == 0 && (x.DueDate ?? x.InvoiceDate) > today && (x.DueDate ?? x.InvoiceDate) <= today.AddDays(7)).Sum(x => x.Outstanding);
        return new CollectionsOverviewDto(today, total, overdueTotal, dueToday, dueNext7, customerRows.Count, customerRows.Count(x => x.OverdueBalance > 0), customerRows);
    }

    public async Task<bool> UpdateFollowUpAsync(Guid customerId, UpdateCollectionFollowUpRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!await _db.ParentGroups.AnyAsync(x => x.Id == customerId && !x.IsDeleted, cancellationToken)) return false;
        var allowed = new[] { "Not contacted", "Contacted", "Promised to pay", "Dispute", "Escalated", "Paid" };
        if (!allowed.Contains(request.Status, StringComparer.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid collection follow-up status.");
        var followUp = await _db.Set<CollectionFollowUp>().FirstOrDefaultAsync(x => x.ParentGroupId == customerId, cancellationToken);
        if (followUp is null) { followUp = new CollectionFollowUp { ParentGroupId = customerId, CreatedBy = userId }; _db.Add(followUp); }
        followUp.Status = allowed.First(x => x.Equals(request.Status, StringComparison.OrdinalIgnoreCase));
        followUp.NextFollowUpDate = request.NextFollowUpDate;
        followUp.LastContactMethod = string.IsNullOrWhiteSpace(request.ContactMethod) ? followUp.LastContactMethod : request.ContactMethod.Trim();
        followUp.Notes = request.Notes?.Trim();
        if (!string.Equals(followUp.Status, "Not contacted", StringComparison.OrdinalIgnoreCase)) followUp.LastContactedAt = DateTime.UtcNow;
        followUp.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
