using Microsoft.EntityFrameworkCore;
using NurturedChoice.Application.Abstractions;
using NurturedChoice.Application.DTOs.Settings;
using NurturedChoice.Domain.Entities.Settings;
using NurturedChoice.Infrastructure.Persistence;

namespace NurturedChoice.Infrastructure.Services;

public sealed class CompanyProfileService : ICompanyProfileService
{
    private readonly SalesDbContext _db;

    public CompanyProfileService(SalesDbContext db) => _db = db;

    public async Task<CompanyProfileDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var profile = await _db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("No active company profile is configured.");

        return ToDto(profile);
    }

    public async Task<CompanyProfileDto> UpdateAsync(UpdateCompanyProfileRequest request, Guid? userId, CancellationToken cancellationToken = default)
    {
        var profile = await _db.CompanyProfiles.FirstOrDefaultAsync(x => x.IsActive, cancellationToken)
            ?? new CompanyProfile { IsActive = true, CreatedBy = userId };

        profile.CompanyName = request.CompanyName.Trim();
        profile.Email = Clean(request.Email);
        profile.Phone = Clean(request.Phone);
        profile.Address = Clean(request.Address);
        profile.Country = Clean(request.Country);
        profile.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        profile.UpdatedBy = userId;

        if (profile.Id == Guid.Empty)
        {
            _db.CompanyProfiles.Add(profile);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(profile);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CompanyProfileDto ToDto(CompanyProfile profile) => new(
        profile.Id,
        profile.CompanyName,
        profile.Email,
        profile.Phone,
        profile.Address,
        profile.Country,
        profile.CurrencyCode ?? "KES",
        profile.LogoUrl);
}
