using NurturedChoice.Application.DTOs.Settings;

namespace NurturedChoice.Application.Abstractions;

public interface ICompanyProfileService
{
    Task<CompanyProfileDto> GetAsync(CancellationToken cancellationToken = default);

    Task<CompanyProfileDto> UpdateAsync(UpdateCompanyProfileRequest request, Guid? userId, CancellationToken cancellationToken = default);
}
