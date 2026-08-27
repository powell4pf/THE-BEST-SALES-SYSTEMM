using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Dashboard;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class DashboardService : IDashboardService
{
    private readonly SalesDbContext _db;
    public DashboardService(SalesDbContext db) => _db = db;

    private static (DateOnly Today, DateTime StartUtc, DateTime EndUtc) NairobiTodayWindow()
    {
        var zoneId = OperatingSystem.IsWindows() ? "E. Africa Standard Time" : "Africa/Nairobi";
        var zone = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
        var localStart = DateTime.SpecifyKind(today.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var startUtc = TimeZoneInfo.ConvertTimeToUtc(localStart, zone);
        return (today, startUtc, startUtc.AddDays(1));
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var (today, todayStartUtc, tomorrowStartUtc) = NairobiTodayWindow();
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var yearStart = new DateOnly(today.Year, 1, 1);
        var invoices = _db.Invoices.AsNoTracking().Where(x => !x.IsDeleted && x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft);
        var totalSales = await invoices.SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        // A sale is visible on the day it was recorded. InvoiceDate remains the
        // accounting date for the monthly and annual totals, while this window
        // also covers a sale entered today with a back-dated invoice date.
        var todaySales = await invoices
            .Where(x => x.InvoiceDate == today || (x.CreatedAt >= todayStartUtc && x.CreatedAt < tomorrowStartUtc))
            .SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var monthlySales = await invoices.Where(x => x.InvoiceDate >= monthStart).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var annualSales = await invoices.Where(x => x.InvoiceDate >= yearStart).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var outstanding = await invoices.Where(x => x.Status != InvoiceStatus.Paid).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        return new DashboardSummaryDto(totalSales, todaySales, monthlySales, annualSales,
            await _db.ParentGroups.CountAsync(ct), await _db.ParentGroups.CountAsync(ct), await _db.Branches.CountAsync(ct),
            await _db.Products.CountAsync(ct), await _db.StockBalances.SumAsync(x => (decimal?)x.QuantityOnHand, ct) ?? 0,
            await _db.Products.CountAsync(x => x.CurrentStock <= x.MinimumStock, ct), await invoices.CountAsync(ct),
            await _db.Statements.CountAsync(ct), await _db.CreditNotes.CountAsync(ct), outstanding);
    }

    public async Task<DashboardPeriodDto> GetPeriodAsync(DateOnly startDate, DateOnly endDate, CancellationToken ct = default)
    {
        var periodLength = endDate.DayNumber - startDate.DayNumber + 1;
        if (periodLength is < 1 or > 366)
            throw new ArgumentOutOfRangeException(nameof(endDate), "The dashboard period must be between 1 and 366 days.");

        var previousEndDate = startDate.AddDays(-1);
        var previousStartDate = previousEndDate.AddDays(-(periodLength - 1));
        var validInvoices = _db.Invoices.AsNoTracking()
            .Where(x => !x.IsDeleted && x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft);
        var currentInvoices = validInvoices.Where(x => x.InvoiceDate >= startDate && x.InvoiceDate <= endDate);
        var previousInvoices = validInvoices.Where(x => x.InvoiceDate >= previousStartDate && x.InvoiceDate <= previousEndDate);

        var sales = await currentInvoices.SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var previousSales = await previousInvoices.SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var invoiceCount = await currentInvoices.CountAsync(ct);
        var previousInvoiceCount = await previousInvoices.CountAsync(ct);
        var outstandingBalance = await currentInvoices.Where(x => x.Status != InvoiceStatus.Paid).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;

        var dailySales = await currentInvoices
            .GroupBy(x => x.InvoiceDate)
            .Select(group => new { Date = group.Key, Sales = group.Sum(x => x.GrandTotal) })
            .ToListAsync(ct);
        var salesByDate = dailySales.ToDictionary(x => x.Date, x => x.Sales);
        var trend = Enumerable.Range(0, periodLength)
            .Select(offset =>
            {
                var date = startDate.AddDays(offset);
                var label = periodLength <= 7 ? date.ToString("ddd") : periodLength <= 31 ? date.ToString("d MMM") : date.ToString("d MMM");
                return new SalesTrendPointDto(label, salesByDate.GetValueOrDefault(date));
            })
            .ToList();

        var customerRows = await currentInvoices
            .GroupBy(x => x.ParentGroup!.CompanyName)
            .Select(group => new { CustomerName = group.Key, Revenue = group.Sum(x => x.GrandTotal) })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(ct);
        var topCustomers = customerRows.Select(x => new CustomerRevenueDto(x.CustomerName, x.Revenue)).ToList();
        decimal? salesChangePercentage = previousSales == 0 ? null : Math.Round((sales - previousSales) / previousSales * 100, 1);

        return new DashboardPeriodDto(startDate, endDate, sales, previousSales, salesChangePercentage, invoiceCount, previousInvoiceCount, outstandingBalance, trend, topCustomers);
    }

    public async Task<IReadOnlyList<SalesTrendPointDto>> GetSalesTrendAsync(string range, CancellationToken ct = default)
    {
        var (today, _, _) = NairobiTodayWindow();
        var start = new DateOnly(today.Year, today.Month, 1).AddMonths(-5);
        var rows = await _db.Invoices.AsNoTracking().Where(x => x.InvoiceDate >= start && !x.IsDeleted && x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft).GroupBy(x => new { x.InvoiceDate.Year, x.InvoiceDate.Month }).Select(g => new { g.Key.Year, g.Key.Month, Sales = g.Sum(x => x.GrandTotal) }).ToListAsync(ct);
        return Enumerable.Range(0, 6).Select(i => { var date = new DateOnly(start.Year, start.Month, 1).AddMonths(i); var row = rows.FirstOrDefault(x => x.Year == date.Year && x.Month == date.Month); return new SalesTrendPointDto(date.ToString("MMM"), row?.Sales ?? 0); }).ToList();
    }

    public async Task<IReadOnlyList<ProductPerformanceDto>> GetProductPerformanceAsync(CancellationToken ct = default)
    {
        var rows = await _db.InvoiceItems.AsNoTracking()
            .Join(_db.Invoices.AsNoTracking().Where(i => !i.IsDeleted && i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft), item => item.InvoiceId, invoice => invoice.Id, (item, _) => item)
            .GroupBy(i => i.ItemName)
            .Select(g => new { ProductName = g.Key, Quantity = g.Sum(i => i.Quantity), Revenue = g.Sum(i => i.LineTotal) })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(ct);
        return rows.Select(x => new ProductPerformanceDto(x.ProductName, x.Quantity, x.Revenue)).ToList();
    }

    public async Task<IReadOnlyList<CustomerRevenueDto>> GetCustomerRevenueAsync(CancellationToken ct = default)
    {
        var rows = await _db.Invoices.AsNoTracking()
            .Where(i => !i.IsDeleted && i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft)
            .GroupBy(i => i.ParentGroup!.CompanyName)
            .Select(g => new { CustomerName = g.Key, Revenue = g.Sum(i => i.GrandTotal) })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(ct);
        return rows.Select(x => new CustomerRevenueDto(x.CustomerName, x.Revenue)).ToList();
    }
    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(CancellationToken ct = default)
    {
        var invoices = await _db.Invoices.AsNoTracking()
            .Where(x => !x.IsDeleted && x.Status != InvoiceStatus.Cancelled)
            // Team Pulse is showing the date printed on the invoice. Do not
            // use the audit timestamp here: older records can have a missing
            // or default CreatedAt value, which renders as 1 Jan in the UI.
            .OrderByDescending(x => x.InvoiceDate)
            .ThenByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new { x.InvoiceNumber, x.InvoiceDate })
            .ToListAsync(ct);

        return invoices
            .Select(x => new RecentActivityItemDto(
                "Invoice",
                $"Invoice {x.InvoiceNumber} created",
                // Serialize the date as midnight UTC so the browser cannot
                // shift the displayed day based on its local timezone.
                x.InvoiceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                x.InvoiceNumber))
            .ToList();
    }
}
