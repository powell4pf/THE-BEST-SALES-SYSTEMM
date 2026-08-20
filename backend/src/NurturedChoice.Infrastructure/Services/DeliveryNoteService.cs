using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Domain.Entities.Billing;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class DeliveryNoteService : IDeliveryNoteService
{
    private readonly SalesDbContext _db;
    public DeliveryNoteService(SalesDbContext db) => _db = db;

    public async Task<PagedResult<DeliveryNoteListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = from note in _db.DeliveryNotes.AsNoTracking().Where(x => !x.IsDeleted)
                    join customer in _db.ParentGroups.AsNoTracking() on note.ParentGroupId equals customer.Id
                    select new { note.Id, note.DeliveryNoteNumber, CustomerName = customer.CompanyName, note.DeliveryDate, note.Status, Items = note.Items.Count(), TotalQuantity = note.Items.Sum(item => (decimal?)item.Quantity) ?? 0 };
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.DeliveryNoteNumber.Contains(term) || x.CustomerName.Contains(term));
        }
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(x => x.DeliveryDate).ThenByDescending(x => x.DeliveryNoteNumber).Skip(request.Skip).Take(request.PageSize).ToListAsync(cancellationToken);
        var items = rows.Select(x => new DeliveryNoteListItemDto(x.Id, x.DeliveryNoteNumber, x.CustomerName, x.DeliveryDate, x.Items, x.TotalQuantity, x.Status.ToString())).ToList();
        return new PagedResult<DeliveryNoteListItemDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<DeliveryNoteDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var note = await _db.DeliveryNotes.AsNoTracking().Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (note is null) return null;
        var productIds = note.Items.Where(x => x.ProductId.HasValue).Select(x => x.ProductId!.Value).ToList();
        var names = await _db.Products.AsNoTracking().Where(x => productIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        return new DeliveryNoteDetailsDto(note.Id, note.DeliveryNoteNumber, note.ParentGroupId, note.BranchId, note.DeliveryDate, note.Notes, note.Status.ToString(), note.Items.Select(x => new DeliveryNoteItemDto(x.Id, x.ProductId, names.GetValueOrDefault(x.ProductId ?? Guid.Empty, x.ItemName), x.Quantity)).ToList());
    }

    public async Task<string> GetNextNumberAsync(CancellationToken cancellationToken = default)
    {
        var latest = await _db.DeliveryNotes.AsNoTracking().OrderByDescending(x => x.DeliveryNoteNumber).Select(x => x.DeliveryNoteNumber).FirstOrDefaultAsync(cancellationToken);
        var next = 1;
        if (!string.IsNullOrWhiteSpace(latest) && int.TryParse(new string(latest.Reverse().TakeWhile(char.IsDigit).Reverse().ToArray()), out var parsed)) next = parsed + 1;
        return $"DN-{next:000000}";
    }

    public async Task<Guid> CreateAsync(CreateDeliveryNoteRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        await ValidateRequestAsync(request, cancellationToken);
        var note = new DeliveryNote { DeliveryNoteNumber = request.DeliveryNoteNumber.Trim(), ParentGroupId = request.CustomerId, BranchId = request.BranchId, DeliveryDate = request.DeliveryDate, Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(), CreatedBy = userId };
        var names = await _db.Products.Where(x => request.Items.Select(i => i.ProductId).Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        note.Items = request.Items.Select(item => new DeliveryNoteItem { ProductId = item.ProductId, ItemName = names[item.ProductId], Quantity = item.Quantity, CreatedBy = userId }).ToList();
        _db.DeliveryNotes.Add(note);
        await _db.SaveChangesAsync(cancellationToken);
        return note.Id;
    }

    public async Task<bool> UpdateAsync(Guid id, CreateDeliveryNoteRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        await ValidateRequestAsync(request, cancellationToken);
        var note = await _db.DeliveryNotes.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (note is null) return false;
        var names = await _db.Products.Where(x => request.Items.Select(i => i.ProductId).Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.ProductName, cancellationToken);
        note.DeliveryNoteNumber = request.DeliveryNoteNumber.Trim(); note.ParentGroupId = request.CustomerId; note.BranchId = request.BranchId; note.DeliveryDate = request.DeliveryDate; note.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(); note.UpdatedBy = userId;
        _db.DeliveryNoteItems.RemoveRange(note.Items);
        note.Items = request.Items.Select(item => new DeliveryNoteItem { ProductId = item.ProductId, ItemName = names[item.ProductId], Quantity = item.Quantity, CreatedBy = userId }).ToList();
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var note = await _db.DeliveryNotes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (note is null) return false;
        note.IsDeleted = true; note.DeletedBy = userId; note.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task ValidateRequestAsync(CreateDeliveryNoteRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DeliveryNoteNumber)) throw new InvalidOperationException("Delivery note number is required.");
        if (request.Items is null || request.Items.Count == 0) throw new InvalidOperationException("At least one product is required.");
        if (request.Items.Any(x => x.Quantity <= 0)) throw new InvalidOperationException("Product quantities must be greater than zero.");
        if (!await _db.ParentGroups.AsNoTracking().AnyAsync(x => x.Id == request.CustomerId && !x.IsDeleted, cancellationToken)) throw new InvalidOperationException("The selected customer was not found.");
        var ids = request.Items.Select(x => x.ProductId).Distinct().ToList();
        if (await _db.Products.AsNoTracking().CountAsync(x => ids.Contains(x.Id) && !x.IsDeleted, cancellationToken) != ids.Count) throw new InvalidOperationException("One or more selected products were not found.");
        if (request.BranchId.HasValue && !await _db.Branches.AsNoTracking().AnyAsync(x => x.Id == request.BranchId && x.ParentGroupId == request.CustomerId && !x.IsDeleted, cancellationToken)) throw new InvalidOperationException("The selected branch does not belong to the customer.");
    }
}
