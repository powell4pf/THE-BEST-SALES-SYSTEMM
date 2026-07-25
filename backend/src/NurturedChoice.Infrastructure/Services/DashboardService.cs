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

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var yearStart = new DateOnly(today.Year, 1, 1);
        var invoices = _db.Invoices.AsNoTracking().Where(x => x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft);
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
        var start = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-5));
        var rows = await _db.Invoices.AsNoTracking().Where(x => x.InvoiceDate >= start && x.Status != InvoiceStatus.Cancelled && x.Status != InvoiceStatus.Draft).GroupBy(x => new { x.InvoiceDate.Year, x.InvoiceDate.Month }).Select(g => new { g.Key.Year, g.Key.Month, Sales = g.Sum(x => x.GrandTotal) }).ToListAsync(ct);
        return Enumerable.Range(0, 6).Select(i => { var date = new DateOnly(start.Year, start.Month, 1).AddMonths(i); var row = rows.FirstOrDefault(x => x.Year == date.Year && x.Month == date.Month); return new SalesTrendPointDto(date.ToString("MMM"), row?.Sales ?? 0); }).ToList();
    }

    public async Task<IReadOnlyList<ProductPerformanceDto>> GetProductPerformanceAsync(CancellationToken ct = default) => await _db.InvoiceItems.AsNoTracking().Join(_db.Invoices.AsNoTracking().Where(i => i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft), item => item.InvoiceId, invoice => invoice.Id, (item, _) => item).GroupBy(i => i.ItemName).Select(g => new ProductPerformanceDto(g.Key, g.Sum(i => i.Quantity), g.Sum(i => i.LineTotal))).OrderByDescending(x => x.Revenue).Take(10).ToListAsync(ct);
    public async Task<IReadOnlyList<CustomerRevenueDto>> GetCustomerRevenueAsync(CancellationToken ct = default) => await _db.Invoices.AsNoTracking().Where(i => i.Status != InvoiceStatus.Cancelled && i.Status != InvoiceStatus.Draft).GroupBy(i => i.ParentGroup!.CompanyName).Select(g => new CustomerRevenueDto(g.Key, g.Sum(i => i.GrandTotal))).OrderByDescending(x => x.Revenue).Take(10).ToListAsync(ct);
    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(CancellationToken ct = default)
    {
        var invoices = await _db.Invoices.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(10).Select(x => new RecentActivityItemDto("Invoice", $"Invoice {x.InvoiceNumber} created", x.CreatedAt, x.InvoiceNumber)).ToListAsync(ct);
        return invoices;
    }
}
