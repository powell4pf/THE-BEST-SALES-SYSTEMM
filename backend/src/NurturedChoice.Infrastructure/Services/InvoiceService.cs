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
    private const string DefaultInvoiceNotes = "Thank you for doing business with us.";
    private readonly SalesDbContext _db;

    public InvoiceService(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<InvoiceDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _db.Invoices.AsNoTracking().Include(x => x.Items).Include(x => x.ParentGroup).Include(x => x.Branch)
            .Where(x => !x.IsDeleted)
            .AsQueryable();

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
                x.Items.Select(i => new InvoiceItemDto(i.Id, i.InvoiceId, i.ProductId, i.ItemName, i.ItemDescription, i.Quantity, i.UnitPrice, 0m, 0m, i.LineTotal)).ToList(),
                x.ParentGroup == null ? null : x.ParentGroup.CompanyName,
                x.Branch == null ? null : x.Branch.BranchName,
                x.ParentGroup == null ? null : x.ParentGroup.Address))
            .ToListAsync(cancellationToken);

        return new PagedResult<InvoiceDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<InvoiceDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Invoices.AsNoTracking().Include(x => x.Items).Include(x => x.ParentGroup).Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
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
                entity.Items.Select(i => new InvoiceItemDto(i.Id, i.InvoiceId, i.ProductId, i.ItemName, i.ItemDescription, i.Quantity, i.UnitPrice, 0m, 0m, i.LineTotal)).ToList(),
                entity.ParentGroup?.CompanyName,
                entity.Branch?.BranchName,
                entity.ParentGroup?.Address);
    }

    public async Task<Guid> CreateDraftAsync(CreateInvoiceRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
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
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? DefaultInvoiceNotes : request.Notes.Trim(),
            Status = InvoiceStatus.Draft,
            CreatedBy = userId
        };

        foreach (var item in request.Items)
        {
            var lineTotal = Math.Round(item.Quantity * item.UnitPrice, 2);
            invoice.Items.Add(new InvoiceItem
            {
                ProductId = item.ProductId,
                ItemName = item.ItemName.Trim(),
                ItemDescription = item.ItemDescription?.Trim(),
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Discount = 0,
                Tax = 0,
                LineTotal = lineTotal,
                CreatedBy = userId
            });
        }

        invoice.Subtotal = invoice.Items.Sum(x => x.Quantity * x.UnitPrice);
        invoice.DiscountTotal = 0;
        invoice.TaxTotal = 0;
        invoice.GrandTotal = invoice.Items.Sum(x => x.LineTotal);

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return invoice.Id;
    }

    public async Task<bool> FinalizeAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (invoice is null) return false;
        invoice.Status = InvoiceStatus.Finalized;
        invoice.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateAsync(Guid id, CreateInvoiceRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (invoice is null || invoice.Status != InvoiceStatus.Draft) return false;
        invoice.LpoNumber = request.LpoNumber?.Trim(); invoice.InvoiceDate = request.InvoiceDate; invoice.ParentGroupId = request.ParentGroupId; invoice.BranchId = request.BranchId; invoice.Salesperson = request.Salesperson?.Trim(); invoice.PaymentTerms = request.PaymentTerms?.Trim(); invoice.DueDate = request.DueDate; invoice.Notes = string.IsNullOrWhiteSpace(request.Notes) ? DefaultInvoiceNotes : request.Notes.Trim(); invoice.Items.Clear();
        foreach (var item in request.Items) invoice.Items.Add(new InvoiceItem { ProductId = item.ProductId, ItemName = item.ItemName.Trim(), ItemDescription = item.ItemDescription?.Trim(), Quantity = item.Quantity, UnitPrice = item.UnitPrice, Discount = 0, Tax = 0, LineTotal = Math.Round(item.Quantity * item.UnitPrice, 2), CreatedBy = userId });
        invoice.Subtotal = invoice.Items.Sum(x => x.Quantity * x.UnitPrice); invoice.DiscountTotal = 0; invoice.TaxTotal = 0; invoice.GrandTotal = invoice.Items.Sum(x => x.LineTotal); invoice.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        var deleted = await PermanentlyDeleteAsync(id, cancellationToken, activeOnly: true);
        if (!deleted) return false;
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private async Task<string> EnsureInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken)
    {
        var existing = await _db.Invoices.FirstOrDefaultAsync(x => x.InvoiceNumber == invoiceNumber, cancellationToken);
        if (existing is not null)
        {
            // Remove records hidden by the previous soft-delete behaviour so a
            // legitimately deleted invoice number can be used again.
            if (existing.IsDeleted)
            {
                await PermanentlyDeleteAsync(existing.Id, cancellationToken, activeOnly: false);
                return invoiceNumber;
            }
            throw new InvalidOperationException($"Invoice number '{invoiceNumber}' already exists.");
        }

        return invoiceNumber;
    }

    private async Task<bool> PermanentlyDeleteAsync(Guid id, CancellationToken cancellationToken, bool activeOnly)
    {
        var invoice = await _db.Invoices
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id && (!activeOnly || !x.IsDeleted), cancellationToken);
        if (invoice is null) return false;

        // Keep payment and credit-note history intact, but remove only the link
        // to the invoice that is being permanently deleted.
        var paymentAllocations = await _db.PaymentAllocations
            .Where(x => x.InvoiceId == id)
            .ToListAsync(cancellationToken);
        foreach (var allocation in paymentAllocations) allocation.InvoiceId = null;

        var creditNotes = await _db.CreditNotes
            .Where(x => x.InvoiceId == id)
            .ToListAsync(cancellationToken);
        foreach (var creditNote in creditNotes) creditNote.InvoiceId = null;

        _db.InvoiceItems.RemoveRange(invoice.Items);
        _db.Invoices.Remove(invoice);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
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
