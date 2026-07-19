using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Customers;
using NurturedChoice.Domain.Entities.Customers;
using NurturedChoice.Domain.Enums;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class ParentGroupService : IParentGroupService
{
    private readonly SalesDbContext _db;

    public ParentGroupService(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<ParentGroupListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = _db.ParentGroups
            .AsNoTracking()
            .Include(x => x.Branches)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => x.CompanyName.Contains(term) ||
                                     (x.ContactPerson != null && x.ContactPerson.Contains(term)) ||
                                     (x.Email != null && x.Email.Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(x => x.CompanyName)
            .Skip(request.Skip)
            .Take(request.PageSize)
            .Select(x => new ParentGroupListItemDto(
                x.Id,
                x.CompanyName,
                x.ContactPerson,
                x.Email,
                x.Phone,
                x.CreditLimit,
                x.Status.ToString(),
                x.Branches.Count))
            .ToListAsync(cancellationToken);

        return new PagedResult<ParentGroupListItemDto>(items, total, request.Page, request.PageSize);
    }

    public async Task<ParentGroupDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ParentGroups
            .AsNoTracking()
            .Include(x => x.Branches)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null
            ? null
            : new ParentGroupDetailsDto(
                entity.Id,
                entity.CompanyName,
                entity.ContactPerson,
                entity.Email,
                entity.Phone,
                entity.Address,
                entity.KraPin,
                entity.CreditLimit,
                entity.Status.ToString(),
                entity.Branches
                    .OrderBy(x => x.BranchName)
                    .Select(x => new BranchDto(x.Id, x.ParentGroupId, x.BranchName, x.Address, x.ContactPerson, x.Email, x.Phone))
                    .ToList());
    }

    public async Task<Guid> CreateAsync(CreateParentGroupRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = new ParentGroup
        {
            CompanyName = request.CompanyName.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Address = request.Address?.Trim(),
            KraPin = request.KraPin?.Trim(),
            CreditLimit = request.CreditLimit,
            Status = RecordStatus.Active,
            CreatedBy = userId
        };

        _db.ParentGroups.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        if (request.Branches is { Count: > 0 })
        {
            foreach (var branchRequest in request.Branches)
            {
                _db.Branches.Add(new Branch
                {
                    ParentGroupId = entity.Id,
                    BranchName = branchRequest.BranchName.Trim(),
                    Address = branchRequest.Address?.Trim(),
                    ContactPerson = branchRequest.ContactPerson?.Trim(),
                    Email = branchRequest.Email?.Trim(),
                    Phone = branchRequest.Phone?.Trim(),
                    CreatedBy = userId
                });
            }

            await _db.SaveChangesAsync(cancellationToken);
        }

        return entity.Id;
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateParentGroupRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ParentGroups.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;

        entity.CompanyName = request.CompanyName.Trim();
        entity.ContactPerson = request.ContactPerson?.Trim();
        entity.Email = request.Email?.Trim();
        entity.Phone = request.Phone?.Trim();
        entity.Address = request.Address?.Trim();
        entity.KraPin = request.KraPin?.Trim();
        entity.CreditLimit = request.CreditLimit;
        entity.UpdatedBy = userId;

        if (request.Branches is not null)
        {
            var existingBranches = await _db.Branches.Where(x => x.ParentGroupId == id).ToListAsync(cancellationToken);
            var incomingIds = new HashSet<Guid>();

            foreach (var branchRequest in request.Branches)
            {
                if (branchRequest.Id is Guid branchId)
                {
                    incomingIds.Add(branchId);
                    var branchEntity = existingBranches.FirstOrDefault(x => x.Id == branchId);
                    if (branchEntity is not null)
                    {
                        branchEntity.BranchName = branchRequest.BranchName.Trim();
                        branchEntity.Address = branchRequest.Address?.Trim();
                        branchEntity.ContactPerson = branchRequest.ContactPerson?.Trim();
                        branchEntity.Email = branchRequest.Email?.Trim();
                        branchEntity.Phone = branchRequest.Phone?.Trim();
                        branchEntity.UpdatedBy = userId;
                        continue;
                    }
                }

                var newBranch = new Branch
                {
                    ParentGroupId = id,
                    BranchName = branchRequest.BranchName.Trim(),
                    Address = branchRequest.Address?.Trim(),
                    ContactPerson = branchRequest.ContactPerson?.Trim(),
                    Email = branchRequest.Email?.Trim(),
                    Phone = branchRequest.Phone?.Trim(),
                    CreatedBy = userId
                };

                _db.Branches.Add(newBranch);
                incomingIds.Add(newBranch.Id);
            }

            foreach (var branchEntity in existingBranches.Where(branch => !incomingIds.Contains(branch.Id)))
            {
                branchEntity.IsDeleted = true;
                branchEntity.DeletedAt = DateTime.UtcNow;
                branchEntity.DeletedBy = userId;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ParentGroups.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<Guid?> AddBranchAsync(Guid parentGroupId, CreateBranchRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var exists = await _db.ParentGroups.AnyAsync(x => x.Id == parentGroupId, cancellationToken);
        if (!exists) return null;

        var branch = new Branch
        {
            ParentGroupId = parentGroupId,
            BranchName = request.BranchName.Trim(),
            Address = request.Address?.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            CreatedBy = userId
        };

        _db.Branches.Add(branch);
        await _db.SaveChangesAsync(cancellationToken);
        return branch.Id;
    }

    public async Task<bool> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Branches.FirstOrDefaultAsync(x => x.Id == branchId, cancellationToken);
        if (entity is null) return false;

        entity.BranchName = request.BranchName.Trim();
        entity.Address = request.Address?.Trim();
        entity.ContactPerson = request.ContactPerson?.Trim();
        entity.Email = request.Email?.Trim();
        entity.Phone = request.Phone?.Trim();
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteBranchAsync(Guid branchId, Guid? userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.Branches.FirstOrDefaultAsync(x => x.Id == branchId, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
