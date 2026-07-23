using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class CreditNoteService : ICreditNoteService
{
    private readonly SalesDbContext _db;

    public CreditNoteService(SalesDbContext db) => _db = db;

    public async Task<PagedResult<CreditNoteListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = from note in _db.CreditNotes.AsNoTracking()
                    join customer in _db.ParentGroups.AsNoTracking() on note.ParentGroupId equals customer.Id
                    join invoice in _db.Invoices.AsNoTracking() on note.InvoiceId equals invoice.Id into invoices
                    from invoice in invoices.DefaultIfEmpty()
                    select new CreditNoteListItemDto(note.Id, note.CreditNoteNumber, customer.CompanyName, invoice == null ? null : invoice.InvoiceNumber, note.CreditDate, note.TotalAmount, note.Status.ToString());

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.CreditNoteNumber.Contains(term) || x.CustomerName.Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreditNoteDate).ThenByDescending(x => x.CreditNoteNumber).Skip(request.Skip).Take(request.PageSize).ToListAsync(cancellationToken);
        return new PagedResult<CreditNoteListItemDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<CreditNoteDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var note = await _db.CreditNotes.AsNoTracking().Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (note is null) return null;
        var productNames = await _db.Products.AsNoTracking().Where(x => note.Items.Select(i => i.ProductId).Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        return new CreditNoteDetailsDto(note.Id, note.CreditNoteNumber, note.ParentGroupId, note.InvoiceId, note.CreditDate, note.Reason ?? string.Empty, note.TotalAmount, note.Status.ToString(), note.Items.Select(x => new CreditNoteItemDto(x.Id, x.ProductId, productNames.GetValueOrDefault(x.ProductId ?? Guid.Empty, x.ItemName), x.Quantity, x.UnitPrice, x.LineTotal, note.Reason)).ToList());
    }

    public async Task<string> GetNextNumberAsync(CancellationToken cancellationToken = default)
    {
        var latest = await _db.CreditNotes.AsNoTracking().OrderByDescending(x => x.CreditNoteNumber).Select(x => x.CreditNoteNumber).FirstOrDefaultAsync(cancellationToken);
        var next = 1;
        if (!string.IsNullOrWhiteSpace(latest) && int.TryParse(new string(latest.Reverse().TakeWhile(char.IsDigit).Reverse().ToArray()), out var parsed)) next = parsed + 1;
        return $"CN-{next:000000}";
    }

    public async Task<Guid> CreateAsync(CreateCreditNoteRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var note = new CreditNote { CreditNoteNumber = request.CreditNoteNumber.Trim(), ParentGroupId = request.CustomerId, InvoiceId = request.InvoiceId, CreditDate = request.CreditNoteDate, Reason = request.Subject.Trim(), CreatedBy = userId };
        var productNames = await _db.Products.Where(x => request.Items.Select(i => i.ProductId).Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        foreach (var item in request.Items)
        {
            note.Items.Add(new CreditNoteItem { ProductId = item.ProductId, ItemName = productNames.GetValueOrDefault(item.ProductId, "Item"), Quantity = item.Quantity, UnitPrice = item.UnitPrice, LineTotal = item.Quantity * item.UnitPrice, CreatedBy = userId });
        }
        note.TotalAmount = note.Items.Sum(x => x.LineTotal);
        _db.CreditNotes.Add(note);
        await _db.SaveChangesAsync(cancellationToken);
        return note.Id;
    }

    public async Task<bool> UpdateAsync(Guid id, CreateCreditNoteRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var note = await _db.CreditNotes.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (note is null) return false;
        note.CreditNoteNumber = request.CreditNoteNumber.Trim(); note.ParentGroupId = request.CustomerId; note.InvoiceId = request.InvoiceId; note.CreditDate = request.CreditNoteDate; note.Reason = request.Subject.Trim(); note.UpdatedBy = userId;
        _db.CreditNoteItems.RemoveRange(note.Items);
        var productNames = await _db.Products.Where(x => request.Items.Select(i => i.ProductId).Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        note.Items = request.Items.Select(item => new CreditNoteItem { ProductId = item.ProductId, ItemName = productNames.GetValueOrDefault(item.ProductId, "Item"), Quantity = item.Quantity, UnitPrice = item.UnitPrice, LineTotal = item.Quantity * item.UnitPrice, CreatedBy = userId }).ToList();
        note.TotalAmount = note.Items.Sum(x => x.LineTotal);
        await _db.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var note = await _db.CreditNotes.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (note is null) return false;
        note.IsDeleted = true; note.DeletedBy = userId; note.DeletedAt = DateTime.UtcNow; await _db.SaveChangesAsync(cancellationToken); return true;
    }
}
