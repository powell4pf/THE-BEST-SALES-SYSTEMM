using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Reports;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class ReportsService : IReportsService
{
    private readonly SalesDbContext _db;

    public ReportsService(SalesDbContext db) => _db = db;

    public async Task<AccountsReceivableAgingDto> GetAccountsReceivableAgingAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var invoices = await (
            from invoice in _db.Invoices.AsNoTracking()
            join customer in _db.ParentGroups.AsNoTracking() on invoice.ParentGroupId equals customer.Id
            where invoice.Status != Domain.Enums.InvoiceStatus.Cancelled && invoice.Status != Domain.Enums.InvoiceStatus.Draft
            select new { invoice.ParentGroupId, CustomerName = customer.CompanyName, invoice.DueDate, invoice.InvoiceDate, invoice.GrandTotal }
        ).ToListAsync(cancellationToken);

        var items = invoices.GroupBy(x => new { x.ParentGroupId, x.CustomerName }).Select(group =>
        {
            var current = 0m; var days1To30 = 0m; var days31To60 = 0m; var days61To90 = 0m; var days91Plus = 0m;
            foreach (var invoice in group)
            {
                var age = Math.Max(0, today.DayNumber - (invoice.DueDate ?? invoice.InvoiceDate).DayNumber);
                if (age == 0) current += invoice.GrandTotal;
                else if (age <= 30) days1To30 += invoice.GrandTotal;
                else if (age <= 60) days31To60 += invoice.GrandTotal;
                else if (age <= 90) days61To90 += invoice.GrandTotal;
                else days91Plus += invoice.GrandTotal;
            }
            return new AccountsReceivableAgingItemDto(group.Key.ParentGroupId, group.Key.CustomerName, current, days1To30, days31To60, days61To90, days91Plus, current + days1To30 + days31To60 + days61To90 + days91Plus);
        }).OrderByDescending(x => x.Total).ToList();

        return new AccountsReceivableAgingDto(items);
    }
}
