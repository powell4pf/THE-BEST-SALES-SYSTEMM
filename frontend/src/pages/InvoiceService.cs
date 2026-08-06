using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs;
using NurturedChoice.Application.DTOs.Billing;
using NurturedChoice.Domain.Entities;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Application.Services;

public class InvoiceService : IInvoiceService
{
    private readonly SalesDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public InvoiceService(SalesDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Guid> CreateInvoiceAsync(DTOs.Billing.CreateInvoiceRequest request)
    {
        var productIds = request.Items.Select(i => i.ProductId).ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.ProductName);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = request.InvoiceNumber,
            LpoNumber = request.LpoNumber,
            InvoiceDate = DateOnly.Parse(request.InvoiceDate),
            DueDate = DateOnly.Parse(request.DueDate),
            ParentGroupId = request.ParentGroupId,
            BranchId = request.BranchId,
            Salesperson = request.Salesperson,
            PaymentTerms = request.PaymentTerms,
            Notes = request.Notes,
            Status = "Draft",
            CreatedBy = _currentUser.UserId,
            CreatedAt = DateTime.UtcNow,
            Items = request.Items.Select(itemRequest => new InvoiceItem
            {
                Id = Guid.NewGuid(),
                ProductId = itemRequest.ProductId,
                // FIX: Look up the product name from the database and assign it to item_name.
                // This ensures item_name is always populated, even if the frontend fails to send it.
                ItemName = products.TryGetValue(itemRequest.ProductId, out var name) ? name : itemRequest.ItemName,
                Quantity = itemRequest.Quantity,
                UnitPrice = itemRequest.UnitPrice,
                CreatedBy = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        return invoice.Id;
    }

    // Other IInvoiceService methods would be implemented here...
    public Task<PaginatedList<InvoiceSummaryDto>> ListInvoicesAsync(int page = 1, int pageSize = 20, string? sort = null, string? filter = null) => throw new NotImplementedException();
    public Task<InvoiceDetailsDto?> GetInvoiceByIdAsync(Guid id) => throw new NotImplementedException();
    public Task<string> GetNextInvoiceNumberAsync() => throw new NotImplementedException();
    public Task UpdateInvoiceAsync(Guid id, DTOs.Billing.CreateInvoiceRequest request) => throw new NotImplementedException();
    public Task<bool> DeleteInvoiceAsync(Guid id) => throw new NotImplementedException();
}