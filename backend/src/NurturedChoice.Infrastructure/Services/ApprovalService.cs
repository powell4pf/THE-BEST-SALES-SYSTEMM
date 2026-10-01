using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Workflow;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class ApprovalService : IApprovalService
{
    private readonly SalesDbContext _db;
    private readonly IInvoiceService _invoices;
    private readonly IStockService _stock;

    public ApprovalService(SalesDbContext db, IInvoiceService invoices, IStockService stock)
    {
        _db = db;
        _invoices = invoices;
        _stock = stock;
    }

    public async Task<IReadOnlyList<ApprovalRequestDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await (from request in _db.ApprovalRequests.AsNoTracking()
                      join user in _db.AppUsers.AsNoTracking() on request.RequestedBy equals user.Id
                      where request.Status == "Pending"
                      orderby request.CreatedAt descending
                      select new ApprovalRequestDto(request.Id, request.RequestType, request.EntityId,
                          request.RequestedBy, user.DisplayName, request.Status, request.Reason,
                          request.CreatedAt, request.ReviewedAt, request.DecisionComment)).ToListAsync(cancellationToken);
    }

    public async Task<Guid> RequestAsync(string requestType, Guid entityId, Guid requestedBy, string? reason, string payloadJson, CancellationToken cancellationToken = default)
    {
        var exists = await _db.ApprovalRequests.AnyAsync(x => x.EntityId == entityId && x.RequestType == requestType && x.Status == "Pending", cancellationToken);
        if (exists) throw new InvalidOperationException("This action is already waiting for approval.");

        var request = new NurturedChoice.Domain.Entities.Workflow.ApprovalRequest
        {
            RequestType = requestType,
            EntityId = entityId,
            RequestedBy = requestedBy,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
            PayloadJson = payloadJson,
            CreatedBy = requestedBy
        };
        _db.ApprovalRequests.Add(request);
        await _db.SaveChangesAsync(cancellationToken);
        return request.Id;
    }

    public Task<bool> ApproveAsync(Guid id, Guid reviewerId, string? comment, CancellationToken cancellationToken = default)
        => DecideAsync(id, reviewerId, comment, true, cancellationToken);

    public Task<bool> RejectAsync(Guid id, Guid reviewerId, string? comment, CancellationToken cancellationToken = default)
        => DecideAsync(id, reviewerId, comment, false, cancellationToken);

    private async Task<bool> DecideAsync(Guid id, Guid reviewerId, string? comment, bool approve, CancellationToken cancellationToken)
    {
        var request = await _db.ApprovalRequests.FirstOrDefaultAsync(x => x.Id == id && x.Status == "Pending", cancellationToken);
        if (request is null) return false;
        if (request.RequestedBy == reviewerId) throw new InvalidOperationException("The person who requested an action cannot approve it.");

        if (approve)
        {
            switch (request.RequestType)
            {
                case "InvoiceFinalize":
                case "InvoiceCreditSale":
                    if (!await _invoices.FinalizeAsync(request.EntityId, reviewerId, cancellationToken)) return false;
                    break;
                case "InvoiceCancellation":
                    if (!await _invoices.CancelAsync(request.EntityId, reviewerId, cancellationToken)) return false;
                    break;
                case "StockAdjustment":
                    var payload = JsonSerializer.Deserialize<StockApprovalPayload>(request.PayloadJson) ?? throw new InvalidOperationException("The stock approval data is invalid.");
                    if (await _stock.ApplyApprovedAdjustmentAsync(payload.ProductId, payload.AdjustedQuantity, payload.Reason, payload.Notes, reviewerId, cancellationToken) is null) return false;
                    break;
                default: throw new InvalidOperationException("This approval type is not supported.");
            }
        }

        request.Status = approve ? "Approved" : "Rejected";
        request.ReviewedBy = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;
        request.DecisionComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        request.UpdatedBy = reviewerId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public sealed record StockApprovalPayload(Guid ProductId, decimal AdjustedQuantity, string Reason, string? Notes);
}
