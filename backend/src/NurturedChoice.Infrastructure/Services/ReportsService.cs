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
            select new { invoice.Id, invoice.ParentGroupId, CustomerName = customer.CompanyName, invoice.DueDate, invoice.InvoiceDate, invoice.GrandTotal }
        ).ToListAsync(cancellationToken);
        var invoiceIds = invoices.Select(x => x.Id).ToArray();
        var paidByInvoice = await _db.PaymentAllocations.AsNoTracking()
            .Where(x => x.InvoiceId.HasValue && invoiceIds.Contains(x.InvoiceId.Value) && !x.IsDeleted)
            .GroupBy(x => x.InvoiceId!.Value)
            .Select(x => new { InvoiceId = x.Key, Amount = x.Sum(a => a.Amount) })
            .ToDictionaryAsync(x => x.InvoiceId, x => x.Amount, cancellationToken);

        var items = invoices.GroupBy(x => new { x.ParentGroupId, x.CustomerName }).Select(group =>
        {
            var current = 0m; var days1To30 = 0m; var days31To60 = 0m; var days61To90 = 0m; var days91Plus = 0m;
            foreach (var invoice in group)
            {
                var outstanding = Math.Max(0m, invoice.GrandTotal - paidByInvoice.GetValueOrDefault(invoice.Id));
                if (outstanding == 0) continue;
                var dueDate = invoice.DueDate ?? invoice.InvoiceDate;
                var age = Math.Max(0, today.DayNumber - dueDate.DayNumber);
                if (age == 0) current += outstanding;
                else if (age <= 30) days1To30 += outstanding;
                else if (age <= 60) days31To60 += outstanding;
                else if (age <= 90) days61To90 += outstanding;
                else days91Plus += outstanding;
            }
            return new AccountsReceivableAgingItemDto(group.Key.ParentGroupId, group.Key.CustomerName, current, days1To30, days31To60, days61To90, days91Plus, current + days1To30 + days31To60 + days61To90 + days91Plus);
        }).OrderByDescending(x => x.Total).ToList();

        return new AccountsReceivableAgingDto(items);
    }

    public async Task<ReportTableDto> GetReportAsync(string reportKey, CancellationToken cancellationToken = default)
    {
        var valid = new[] { "sales-by-customer", "sales-by-product", "sales-by-salesperson", "inventory-valuation", "stock-movement-history", "inventory-aging", "payment-history" };
        if (!valid.Contains(reportKey, StringComparer.OrdinalIgnoreCase)) throw new KeyNotFoundException("That report is not available.");
        var invoiceQuery = _db.Invoices.AsNoTracking().Where(x => !x.IsDeleted && x.Status != Domain.Enums.InvoiceStatus.Cancelled && x.Status != Domain.Enums.InvoiceStatus.Draft);
        if (reportKey.Equals("sales-by-customer", StringComparison.OrdinalIgnoreCase))
        {
            var source = await (from invoice in invoiceQuery join customer in _db.ParentGroups.AsNoTracking() on invoice.ParentGroupId equals customer.Id join item in _db.InvoiceItems.AsNoTracking() on invoice.Id equals item.InvoiceId where !item.IsDeleted group new { item.Quantity, LineTotal = item.Quantity * item.UnitPrice } by customer.CompanyName into g orderby g.Sum(x => x.LineTotal) descending select new { Customer = g.Key, Invoices = g.Count(), Units = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.LineTotal) }).ToListAsync(cancellationToken);
            var rows = source.Select(x => Row(("customer", x.Customer), ("invoices", x.Invoices), ("units", x.Units), ("revenue", x.Revenue))).ToList();
            return Table(reportKey, "Sales by Customer", "Revenue generated from each customer.", [("customer", "Customer", "text"), ("invoices", "Invoices", "number"), ("units", "Units", "number"), ("revenue", "Revenue", "currency")], rows);
        }
        if (reportKey.Equals("sales-by-product", StringComparison.OrdinalIgnoreCase))
        {
            var source = await (from item in _db.InvoiceItems.AsNoTracking() join invoice in invoiceQuery on item.InvoiceId equals invoice.Id where !item.IsDeleted group new { item.ItemName, item.Quantity, LineTotal = item.Quantity * item.UnitPrice } by item.ItemName into g orderby g.Sum(x => x.LineTotal) descending select new { Product = g.Key, Units = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.LineTotal) }).ToListAsync(cancellationToken);
            var rows = source.Select(x => Row(("product", x.Product), ("units", x.Units), ("revenue", x.Revenue))).ToList();
            return Table(reportKey, "Sales by Product", "Top-performing products by invoiced revenue.", [("product", "Product", "text"), ("units", "Units", "number"), ("revenue", "Revenue", "currency")], rows);
        }
        if (reportKey.Equals("sales-by-salesperson", StringComparison.OrdinalIgnoreCase))
        {
            var source = await (from invoice in invoiceQuery group invoice by invoice.Salesperson ?? "Unassigned" into g orderby g.Sum(x => x.GrandTotal) descending select new { Salesperson = g.Key, Invoices = g.Count(), Revenue = g.Sum(x => x.GrandTotal) }).ToListAsync(cancellationToken);
            var rows = source.Select(x => Row(("salesperson", x.Salesperson), ("invoices", x.Invoices), ("revenue", x.Revenue))).ToList();
            return Table(reportKey, "Sales by Salesperson", "Performance of individual sales team members.", [("salesperson", "Salesperson", "text"), ("invoices", "Invoices", "number"), ("revenue", "Revenue", "currency")], rows);
        }
        if (reportKey.Equals("inventory-valuation", StringComparison.OrdinalIgnoreCase))
        {
            var source = await (from product in _db.Products.AsNoTracking() join balance in _db.StockBalances.AsNoTracking().Where(x => !x.IsDeleted) on product.Id equals balance.ProductId into balances where !product.IsDeleted let quantity = balances.Sum(x => (decimal?)x.QuantityOnHand) ?? 0m select new { product.ProductName, product.Sku, quantity, product.BuyingPrice }).ToListAsync(cancellationToken);
            var rows = source.Select(x => Row(("product", x.ProductName), ("sku", x.Sku), ("units", x.quantity), ("unitCost", x.BuyingPrice), ("value", x.quantity * x.BuyingPrice))).ToList();
            return Table(reportKey, "Inventory Valuation", "Current stock valued at purchase price.", [("product", "Product", "text"), ("sku", "SKU", "text"), ("units", "Units", "number"), ("unitCost", "Unit Cost", "currency"), ("value", "Value", "currency")], rows);
        }
        if (reportKey.Equals("stock-movement-history", StringComparison.OrdinalIgnoreCase))
        {
            var source = await (from movement in _db.StockMovements.AsNoTracking() join product in _db.Products.AsNoTracking() on movement.ProductId equals product.Id where !movement.IsDeleted && !product.IsDeleted orderby movement.CreatedAt descending select new { movement.CreatedAt, product.ProductName, movement.MovementType, movement.Quantity, movement.UnitCost }).Take(1000).ToListAsync(cancellationToken);
            var rows = source.Select(x => Row(("date", x.CreatedAt.ToString("yyyy-MM-dd")), ("product", x.ProductName), ("type", x.MovementType.ToString()), ("quantity", x.Quantity), ("unitCost", x.UnitCost), ("value", x.Quantity * x.UnitCost))).ToList();
            return Table(reportKey, "Stock Movement History", "The latest inventory movements and their values.", [("date", "Date", "text"), ("product", "Product", "text"), ("type", "Movement", "text"), ("quantity", "Quantity", "number"), ("unitCost", "Unit Cost", "currency"), ("value", "Value", "currency")], rows);
        }
        if (reportKey.Equals("inventory-aging", StringComparison.OrdinalIgnoreCase))
        {
            var products = await (from product in _db.Products.AsNoTracking() join balance in _db.StockBalances.AsNoTracking().Where(x => !x.IsDeleted) on product.Id equals balance.ProductId into balances where !product.IsDeleted let quantity = balances.Sum(x => (decimal?)x.QuantityOnHand) ?? 0m select new { product.Id, product.ProductName, quantity, product.BuyingPrice }).ToListAsync(cancellationToken);
            var lastMoves = await _db.StockMovements.AsNoTracking().Where(x => !x.IsDeleted).GroupBy(x => x.ProductId).Select(x => new { ProductId = x.Key, Last = x.Max(m => m.CreatedAt) }).ToDictionaryAsync(x => x.ProductId, x => x.Last, cancellationToken);
            var rows = products.Select(x => { var last = lastMoves.GetValueOrDefault(x.Id); return Row(("product", x.ProductName), ("units", x.quantity), ("lastMovement", last == default ? null : last.ToString("yyyy-MM-dd")), ("daysIdle", last == default ? null : Math.Max(0, (DateTime.UtcNow.Date - last.Date).Days)), ("value", x.quantity * x.BuyingPrice)); }).OrderByDescending(x => x["daysIdle"] as int?).ToList();
            return Table(reportKey, "Inventory Aging", "Stock on hand grouped by how long it has been idle.", [("product", "Product", "text"), ("units", "Units", "number"), ("lastMovement", "Last Movement", "text"), ("daysIdle", "Days Idle", "number"), ("value", "Stock Value", "currency")], rows);
        }
        var paymentSource = await (from payment in _db.Payments.AsNoTracking() join customer in _db.ParentGroups.AsNoTracking() on payment.ParentGroupId equals customer.Id where !payment.IsDeleted orderby payment.PaymentDate descending select new { payment.PaymentDate, Customer = customer.CompanyName, payment.Method, payment.Reference, payment.Amount }).Take(1000).ToListAsync(cancellationToken);
        var paymentRows = paymentSource.Select(x => Row(("date", x.PaymentDate.ToString("yyyy-MM-dd")), ("customer", x.Customer), ("method", x.Method), ("reference", x.Reference), ("amount", x.Amount))).ToList();
        return Table(reportKey, "Payment History", "Payments received from customers.", [("date", "Date", "text"), ("customer", "Customer", "text"), ("method", "Method", "text"), ("reference", "Reference", "text"), ("amount", "Amount", "currency")], paymentRows);
    }

    private static Dictionary<string, object?> Row(params (string Key, object? Value)[] values) => values.ToDictionary(x => x.Key, x => x.Value);
    private static ReportTableDto Table(string key, string title, string description, (string Key, string Label, string Type)[] columns, IReadOnlyList<IReadOnlyDictionary<string, object?>> rows) => new(key, title, description, columns.Select(x => new ReportColumnDto(x.Key, x.Label, x.Type)).ToList(), rows);
}
