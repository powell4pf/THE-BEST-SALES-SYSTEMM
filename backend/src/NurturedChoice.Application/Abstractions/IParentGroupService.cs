using NurturedChoice.Application.Common;
using NurturedChoice.Application.DTOs.Customers;

namespace NurturedChoice.Application.Abstractions;

public interface IParentGroupService
{
    Task<PagedResult<ParentGroupListItemDto>> GetAsync(PagedRequest request, CancellationToken cancellationToken = default);

    Task<ParentGroupDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Guid> CreateAsync(CreateParentGroupRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(Guid id, UpdateParentGroupRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);

    Task<Guid?> AddBranchAsync(Guid parentGroupId, CreateBranchRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, Guid? userId, CancellationToken cancellationToken = default);

    Task<bool> DeleteBranchAsync(Guid branchId, Guid? userId, CancellationToken cancellationToken = default);
}

