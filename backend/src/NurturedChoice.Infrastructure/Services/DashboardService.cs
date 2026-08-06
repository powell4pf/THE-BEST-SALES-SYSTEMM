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

    private static DateOnly NairobiToday()
    {
        var zoneId = OperatingSystem.IsWindows() ? "E. Africa Standard Time" : "Africa/Nairobi";
        var zone = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var today = NairobiToday();
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var yearStart = new DateOnly(today.Year, 1, 1);
        var invoices = _db.Invoices.AsNoTracking().Where(x => !x.IsDeleted && x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft);
        var totalSales = await invoices.SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var todaySales = await invoices.Where(x => x.InvoiceDate == today).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var monthlySales = await invoices.Where(x => x.InvoiceDate >= monthStart).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var annualSales = await invoices.Where(x => x.InvoiceDate >= yearStart).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        var outstanding = await invoices.Where(x => x.Status != InvoiceStatus.Paid).SumAsync(x => (decimal?)x.GrandTotal, ct) ?? 0;
        return new DashboardSummaryDto(totalSales, todaySales, monthlySales, annualSales,
            await _db.ParentGroups.CountAsync(ct), await _db.ParentGroups.CountAsync(ct), await _db.Branches.CountAsync(ct),
            await _db.Products.CountAsync(ct), await _db.StockBalances.SumAsync(x => (decimal?)x.QuantityOnHand, ct) ?? 0,
            await _db.Products.CountAsync(x => x.CurrentStock <= x.MinimumStock, ct), await invoices.CountAsync(ct),
            await _db.Statements.CountAsync(ct), await _db.CreditNotes.CountAsync(ct), outstanding);
    }

    public async Task<IReadOnlyList<SalesTrendPointDto>> GetSalesTrendAsync(string range, CancellationToken ct = default)
    {
        var today = NairobiToday();
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
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.InvoiceDate)
            .Take(10)
            .Select(x => new RecentActivityItemDto("Invoice", $"Invoice {x.InvoiceNumber} created", x.CreatedAt, x.InvoiceNumber))
            .ToListAsync(ct);
        return invoices;
    }
}
