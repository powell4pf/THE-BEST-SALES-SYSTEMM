using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class InvoiceService : IInvoiceService
{
    private readonly SalesDbContext _db;

    public InvoiceService(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<InvoiceDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _db.Invoices.AsNoTracking().Include(x => x.Items).Include(x => x.ParentGroup).Include(x => x.Branch).AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.InvoiceNumber.Contains(term) || (x.LpoNumber != null && x.LpoNumber.Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.InvoiceDate)
            .ThenByDescending(x => x.CreatedAt)
            .Skip(request.Skip)
            .Take(request.PageSize)
            .Select(x => new InvoiceDto(
                x.Id,
                x.InvoiceNumber,
                x.LpoNumber,
                x.InvoiceDate,
                x.ParentGroupId,
                x.BranchId,
                x.Salesperson,
                x.PaymentTerms,
                x.DueDate,
                x.DiscountTotal,
                x.TaxTotal,
                x.Subtotal,
                x.GrandTotal,
                x.Notes,
                x.Status,
                x.Items.Select(i => new InvoiceItemDto(i.Id, i.InvoiceId, i.ProductId, i.ItemName, i.ItemDescription, i.Quantity, i.UnitPrice, i.Discount, i.Tax, i.LineTotal)).ToList(),
                x.ParentGroup == null ? null : x.ParentGroup.CompanyName,
                x.Branch == null ? null : x.Branch.BranchName,
                x.ParentGroup == null ? null : x.ParentGroup.Address))
            .ToListAsync(cancellationToken);

        return new PagedResult<InvoiceDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Invoices.AsNoTracking().Include(x => x.Items).Include(x => x.ParentGroup).Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null
            ? null
            : new InvoiceDto(
                entity.Id,
                entity.InvoiceNumber,
                entity.LpoNumber,
                entity.InvoiceDate,
                entity.ParentGroupId,
                entity.BranchId,
                entity.Salesperson,
                entity.PaymentTerms,
                entity.DueDate,
                entity.DiscountTotal,
                entity.TaxTotal,
                entity.Subtotal,
                entity.GrandTotal,
                entity.Notes,
                entity.Status,
                entity.Items.Select(i => new InvoiceItemDto(i.Id, i.InvoiceId, i.ProductId, i.ItemName, i.ItemDescription, i.Quantity, i.UnitPrice, i.Discount, i.Tax, i.LineTotal)).ToList(),
                entity.ParentGroup?.CompanyName,
                entity.Branch?.BranchName,
                entity.ParentGroup?.Address);
    }

    public async Task<Guid> CreateDraftAsync(CreateInvoiceRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var invoiceNumber = string.IsNullOrWhiteSpace(request.InvoiceNumber)
            ? await GenerateInvoiceNumberAsync(cancellationToken)
            : await EnsureInvoiceNumberAsync(request.InvoiceNumber.Trim(), cancellationToken);

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            LpoNumber = request.LpoNumber?.Trim(),
            InvoiceDate = request.InvoiceDate,
            ParentGroupId = request.ParentGroupId,
            BranchId = request.BranchId,
            Salesperson = request.Salesperson?.Trim(),
            PaymentTerms = request.PaymentTerms?.Trim(),
            DueDate = request.DueDate,
            Notes = request.Notes?.Trim(),
            Status = InvoiceStatus.Draft,
            CreatedBy = userId
        };

        foreach (var item in request.Items)
        {
            var lineTotal = Math.Round((item.Quantity * item.UnitPrice) - item.Discount + item.Tax, 2);
            invoice.Items.Add(new InvoiceItem
            {
                ProductId = item.ProductId,
                ItemName = item.ItemName.Trim(),
                ItemDescription = item.ItemDescription?.Trim(),
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Discount = item.Discount,
                Tax = item.Tax,
                LineTotal = lineTotal,
                CreatedBy = userId
            });
        }

        invoice.Subtotal = invoice.Items.Sum(x => x.Quantity * x.UnitPrice);
        invoice.DiscountTotal = invoice.Items.Sum(x => x.Discount);
        invoice.TaxTotal = invoice.Items.Sum(x => x.Tax);
        invoice.GrandTotal = invoice.Items.Sum(x => x.LineTotal);

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(cancellationToken);
        return invoice.Id;
    }

    public async Task<bool> FinalizeAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (invoice is null) return false;
        invoice.Status = InvoiceStatus.Finalized;
        invoice.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<string> EnsureInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken)
    {
        var exists = await _db.Invoices.AnyAsync(x => x.InvoiceNumber == invoiceNumber, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Invoice number '{invoiceNumber}' already exists.");
        }

        return invoiceNumber;
    }

    private async Task<string> GenerateInvoiceNumberAsync(CancellationToken cancellationToken)
    {
        var settings = await _db.InvoiceNumberSettings.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive, cancellationToken);
        var prefix = settings?.Prefix ?? "INV";
        var padding = settings?.Padding ?? 6;
        var startingNumber = settings?.StartingNumber ?? 1;

        var latest = await _db.Invoices
            .AsNoTracking()
            .Where(x => x.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(x => x.InvoiceNumber)
            .Select(x => x.InvoiceNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextNumber = startingNumber;
        if (!string.IsNullOrWhiteSpace(latest))
        {
            var digits = new string(latest.SkipWhile(c => !char.IsDigit(c)).ToArray());
            if (long.TryParse(digits, out var parsed))
            {
                nextNumber = Math.Max(parsed + 1, startingNumber);
            }
        }

        return $"{prefix}-{nextNumber.ToString().PadLeft(padding, '0')}";
    }
}
